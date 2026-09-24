import type {
  GaOptions,
  PlacedSession,
  SchedulingDayPattern,
  SchedulingInput,
} from "./types";
import {
  expandSubjectsIntoSessions,
  greedyDecode,
  type SubjectUnit,
} from "./csp";
import { validateSolution } from "./validate";

/*
 * Genetic Algorithm optimizer.
 *
 * The CSP has already chosen a day pattern (MW or TTh) per subject; the GA
 * locks that choice in by building exactly ONE unit per subject — the option
 * whose pattern matches the subject's sessions in the seed solution — before
 * optimizing the ordering. It takes the CSP's valid schedule and tries to
 * improve it against soft constraints (minimizing a teacher's idle gaps and
 * same-day overload). The GA only ever produces valid schedules:
 *
 *   - A chromosome is a permutation of subject units. Each unit IS a
 *     day-pair (MW or TTh): decoding it always places both sessions at the
 *     same time in the same room, so the paired-day constraint cannot be
 *     broken by any crossover/mutation/repair step.
 *   - Decoding assigns each unit greedily to its first non-conflicting
 *     candidate time on BOTH pattern days, using the same occupancy rules
 *     as the CSP.
 *   - Members whose decode fails fall back to the current best (valid)
 *     schedule, so the population never contains a conflicting timetable.
 *
 * NOTE: Intentionally NOT wired into the live "Generate Schedule" flow —
 * soft constraints are out of scope for this prototype (project-overview).
 * If enabled later, replace the fallback with a proper cost-aware repair.
 */

interface Member {
  order: readonly string[];
  solution: PlacedSession[];
  fitness: number;
}

export function runGA(
  input: SchedulingInput,
  seedSolution: readonly PlacedSession[],
  options: GaOptions = {},
): PlacedSession[] {
  const seedCheck = validateSolution(input, seedSolution);
  if (!seedCheck.valid) {
    throw new Error(
      `runGA requires a conflict-free seed schedule.\n${seedCheck.violations.join("\n")}`,
    );
  }

  const built = expandSubjectsIntoSessions(input);
  if (
    built.reason ||
    built.reasons.length > 0 ||
    built.domains.length === 0
  ) {
    return [...seedSolution];
  }

  const seedPatternBySubject = new Map<string, SchedulingDayPattern>();
  for (const placement of seedSolution) {
    seedPatternBySubject.set(placement.subjectId, placement.dayPattern);
  }

  const units: SubjectUnit[] = [];
  for (const domain of built.domains) {
    const seedPattern = seedPatternBySubject.get(domain.subject.id);
    const unit =
      domain.options.find((option) => option.dayPattern === seedPattern) ??
      domain.options[0];
    if (unit) {
      units.push(unit);
    }
  }
  const unitKeys = units.map((unit) => unit.unitKey);
  const unitByKey = new Map(units.map((unit) => [unit.unitKey, unit]));

  const populationSize = Math.max(4, options.populationSize ?? 24);
  const maxIterations = Math.max(1, options.maxIterations ?? 60);

  function decodeOrder(order: readonly string[]): PlacedSession[] | null {
    const orderedUnits: SubjectUnit[] = [];
    for (const key of order) {
      const unit = unitByKey.get(key);
      if (!unit) {
        return null;
      }
      orderedUnits.push(unit);
    }
    return greedyDecode(orderedUnits);
  }

  function evaluate(solution: readonly PlacedSession[]): number {
    let penalty = 0;

    const teacherDayStats = new Map<
      string,
      Map<number, { first: number; last: number; minutes: number; count: number }>
    >();

    for (const placement of solution) {
      let stats = teacherDayStats.get(placement.teacherId);
      if (!stats) {
        stats = new Map();
        teacherDayStats.set(placement.teacherId, stats);
      }
      const entry =
        stats.get(placement.dayIndex) ??
        { first: Infinity, last: -Infinity, minutes: 0, count: 0 };
      entry.first = Math.min(entry.first, placement.startMinutes);
      entry.last = Math.max(entry.last, placement.endMinutes);
      entry.minutes += placement.endMinutes - placement.startMinutes;
      entry.count += 1;
      stats.set(placement.dayIndex, entry);
    }

    for (const stats of teacherDayStats.values()) {
      for (const entry of stats.values()) {
        const idleMinutes = entry.last - entry.first - entry.minutes;
        penalty += Math.floor(idleMinutes / 60);
        if (entry.count > 2) {
          penalty += entry.count;
        }
      }
    }

    return penalty;
  }

  const seedOrder = [...unitKeys];
  let best: Member = {
    order: seedOrder,
    solution: [...seedSolution],
    fitness: evaluate(seedSolution),
  };

  let population: Member[] = [best];
  while (population.length < populationSize) {
    const order = shuffled(unitKeys);
    const decoded = decodeOrder(order);
    const solution = decoded ?? best.solution;
    population.push({
      order,
      solution,
      fitness: evaluate(solution),
    });
  }

  for (let generation = 0; generation < maxIterations; generation++) {
    const next: Member[] = [best];
    while (next.length < populationSize) {
      const parentA = tournamentSelect(population);
      const parentB = tournamentSelect(population);
      let childOrder = orderCrossover(parentA.order, parentB.order);
      if (Math.random() < 0.3) {
        childOrder = mutateOrder(childOrder);
      }
      const decoded = decodeOrder(childOrder);
      if (decoded) {
        next.push({
          order: childOrder,
          solution: decoded,
          fitness: evaluate(decoded),
        });
      } else {
        next.push(best);
      }
    }
    population = next;
    best = population.reduce((a, b) => (b.fitness < a.fitness ? b : a));
  }

  return [...best.solution];
}

function shuffled<T>(source: readonly T[]): T[] {
  const copy = [...source];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tournamentSelect(population: readonly Member[]): Member {
  const a = population[Math.floor(Math.random() * population.length)];
  const b = population[Math.floor(Math.random() * population.length)];
  return b.fitness < a.fitness ? b : a;
}

function orderCrossover(
  parentA: readonly string[],
  parentB: readonly string[],
): string[] {
  const size = parentA.length;
  const firstIndex = Math.floor(Math.random() * size);
  const secondIndex = Math.floor(Math.random() * size);
  const [from, to] =
    firstIndex <= secondIndex
      ? [firstIndex, secondIndex]
      : [secondIndex, firstIndex];

  const segment = new Set(parentA.slice(from, to + 1));
  const child: string[] = new Array(size).fill("");

  for (let i = from; i <= to; i++) {
    child[i] = parentA[i];
  }

  let cursor = 0;
  for (const gene of parentB) {
    if (segment.has(gene)) {
      continue;
    }
    while (child[cursor] !== "") {
      cursor++;
    }
    child[cursor] = gene;
  }

  return child;
}

function mutateOrder(order: readonly string[]): string[] {
  const copy = [...order];
  const i = Math.floor(Math.random() * copy.length);
  let j = Math.floor(Math.random() * copy.length);
  while (j === i) {
    j = Math.floor(Math.random() * copy.length);
  }
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}