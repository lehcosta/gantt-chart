import { GANTT_SCALE_CONFIG, TIMELINE_SHIFT_BUFFER } from 'constants/gantt';
import { Dayjs } from 'dayjs';
import {
  GanttBottomRowCell,
  GanttScaleKey,
  GanttTopHeaderGroup,
} from 'types/gantt';
import dayjs from 'utils/dayjs';

export function calculateDateOffsets(
  startDate: Dayjs,
  endDate: Dayjs,
  timelineTicks: GanttBottomRowCell[],
  scaleKey: GanttScaleKey,
): { barMarginLeftAmount: number; barWidthSize: number } {
  if (!timelineTicks.length) {
    return { barMarginLeftAmount: 0, barWidthSize: 0 };
  }

  const { tickUnit, unitPerTick } = GANTT_SCALE_CONFIG[scaleKey];

  let barMarginLeftAmount = 0;
  let barWidthSize = 0;

  for (const tick of timelineTicks) {
    const tickStart = tick.startDate;
    const tickEnd = tickStart.add(unitPerTick, tickUnit);
    const tickWidth = tick.widthPx;

    if (tickEnd.isSameOrBefore(startDate)) {
      barMarginLeftAmount += tickWidth;
      continue;
    }

    if (tickStart.isSameOrAfter(endDate)) {
      break;
    }

    barWidthSize += tickWidth;
  }

  return {
    barMarginLeftAmount,
    barWidthSize: Math.max(barWidthSize, 1),
  };
}

export function findDateRangeFromTasks(
  tasks: Record<string, { startDate: string; endDate: string }>,
): { minDate: Dayjs; maxDate: Dayjs } {
  let minTimestamp = Infinity;
  let maxTimestamp = -Infinity;

  for (const { startDate, endDate } of Object.values(tasks)) {
    const start = dayjs(startDate).valueOf();
    const end = dayjs(endDate).valueOf();
    if (!Number.isNaN(start)) minTimestamp = Math.min(minTimestamp, start);
    if (!Number.isNaN(end)) maxTimestamp = Math.max(maxTimestamp, end);
  }

  return { minDate: dayjs(minTimestamp), maxDate: dayjs(maxTimestamp) };
}

export function padDateRange(
  minDate: Dayjs,
  maxDate: Dayjs,
  selectedScale: GanttScaleKey,
): { paddedMinDate: Dayjs; paddedMaxDate: Dayjs } {
  const { tickUnit, unitPerTick } = GANTT_SCALE_CONFIG[selectedScale];
  return {
    paddedMinDate: minDate.subtract(
      TIMELINE_SHIFT_BUFFER * unitPerTick,
      tickUnit,
    ),
    paddedMaxDate: maxDate.add(TIMELINE_SHIFT_BUFFER * unitPerTick, tickUnit),
  };
}

export function createBottomRowCells(
  paddedMinDate: Dayjs,
  paddedMaxDate: Dayjs,
  selectedScale: GanttScaleKey,
): GanttBottomRowCell[] {
  const {
    tickUnit,
    unitPerTick,
    basePxPerDragStep,
    dragStepUnit,
    dragStepAmount,
  } = GANTT_SCALE_CONFIG[selectedScale];

  const cells: GanttBottomRowCell[] = [];
  let current = paddedMinDate.startOf(tickUnit);

  while (current.isBefore(paddedMaxDate)) {
    // How many drag steps fit in this tick?
    const tickDurationInDragSteps =
      dayjs(current).add(unitPerTick, tickUnit).diff(current, dragStepUnit) /
      dragStepAmount;

    cells.push({
      startDate: current,
      widthPx: tickDurationInDragSteps * basePxPerDragStep,
    });

    current = current.add(unitPerTick, tickUnit);
  }

  return cells;
}

export function createTopHeaderGroups(
  bottomCells: GanttBottomRowCell[],
  selectedScale: GanttScaleKey,
): GanttTopHeaderGroup[] {
  const { labelUnit, formatHeaderLabel } = GANTT_SCALE_CONFIG[selectedScale];
  const groups: GanttTopHeaderGroup[] = [];

  let currentKey: number | null = null;
  let currentLabel = '';
  let currentWidth = 0;
  let currentStart: dayjs.Dayjs | null = null;

  bottomCells.forEach((cell, i) => {
    const start = cell.startDate.startOf(labelUnit);
    const key = start.valueOf(); // ✅ use timestamp instead of formatted string
    const label = formatHeaderLabel?.(start) ?? start.format();

    if (key === currentKey) {
      currentWidth += cell.widthPx;
    } else {
      if (currentKey !== null) {
        groups.push({
          label: currentLabel,
          widthPx: currentWidth,
          startDate: currentStart!,
        });
      }
      currentKey = key;
      currentLabel = label;
      currentWidth = cell.widthPx;
      currentStart = start;
    }

    if (i === bottomCells.length - 1) {
      groups.push({
        label: currentLabel,
        widthPx: currentWidth,
        startDate: currentStart!,
      });
    }
  });

  return groups;
}

export function setupTimelineStructure(
  tasks: Record<string, { startDate: string; endDate: string }>,
  selectedScale: GanttScaleKey,
  updateBottomCells: (cells: GanttBottomRowCell[]) => void,
  updateHeaderGroups: (groups: GanttTopHeaderGroup[]) => void,
) {
  const { minDate, maxDate } = findDateRangeFromTasks(tasks);

  const { paddedMinDate, paddedMaxDate } = padDateRange(
    minDate,
    maxDate,
    selectedScale,
  );

  const bottomCells = createBottomRowCells(
    paddedMinDate,
    paddedMaxDate,
    selectedScale,
  );
  const headerGroups = createTopHeaderGroups(bottomCells, selectedScale);

  updateBottomCells(bottomCells);
  updateHeaderGroups(headerGroups);
}
