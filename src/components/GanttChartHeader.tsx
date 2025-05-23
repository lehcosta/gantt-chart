import { GANTT_SCALE_CONFIG } from 'constants/gantt';
import React, { useEffect, useMemo, useState } from 'react';
import { useGanttStore } from 'stores/store';
import {
  GanttBottomRowCell,
  GanttScaleKey,
  GanttTopHeaderGroup,
} from 'types/gantt';
import { createTopHeaderGroups } from 'utils/timeline';

interface GanttChartHeaderProps {
  topHeaderGroups: GanttTopHeaderGroup[];
  bottomRowCells: GanttBottomRowCell[];
  selectedScale: GanttScaleKey;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const GanttChartHeader: React.FC<GanttChartHeaderProps> = ({
  bottomRowCells,
  selectedScale,
  scrollRef,
}) => {
  const draggingBarDateRange = useGanttStore(
    (state) => state.draggingBarDateRange,
  );

  const config = GANTT_SCALE_CONFIG[selectedScale];
  const [stickyIndex, setStickyIndex] = useState(0);

  // Top header groups
  const topGroups = useMemo(
    () => createTopHeaderGroups(bottomRowCells, selectedScale),
    [bottomRowCells, selectedScale],
  );

  // Merge adjacent labels
  const mergedGroups = useMemo(() => {
    const merged: typeof topGroups = [];
    for (const group of topGroups) {
      const last = merged[merged.length - 1];
      if (last && last.label === group.label) {
        last.widthPx += group.widthPx;
      } else {
        merged.push({ ...group });
      }
    }
    return merged;
  }, [topGroups]);

  // Add left offset
  const mergedGroupsWithLeft = useMemo(() => {
    let offset = 0;
    return mergedGroups.map((group) => {
      const g = { ...group, left: offset };
      offset += group.widthPx;
      return g;
    });
  }, [mergedGroups]);

  // Scroll tracking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      for (let i = mergedGroupsWithLeft.length - 1; i >= 0; i--) {
        if (scrollLeft >= mergedGroupsWithLeft[i].left) {
          setStickyIndex(i);
          break;
        }
      }
    };

    el.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => el.removeEventListener('scroll', handleScroll);
  }, [mergedGroupsWithLeft]);

  const stickyLabel = mergedGroupsWithLeft[stickyIndex]?.label ?? '';

  // find the index of the cell that is in the range of draggingBarDateRange
  const draggingBarDateRangeIndex = useMemo(() => {
    if (!draggingBarDateRange) return -1;
    const { startDate, endDate } = draggingBarDateRange;
    return bottomRowCells.findIndex(
      (cell) =>
        cell.startDate.isSame(startDate, 'day') ||
        cell.startDate.isSame(endDate, 'day'),
    );
  }, [draggingBarDateRange, bottomRowCells]);

  return (
    <div
      // className="sticky top-0 z-30"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backgroundColor: '#F0F1F2',
      }}
    >
      <div
        // className="flex min-w-max flex-col"
        style={{
          display: 'flex',
          minWidth: 'max-content',
          flexDirection: 'column',
          // backgroundColor: '#F0F1F2',
        }}
      >
        {/* Top Header Row */}
        <div
          // className="relative flex h-8"
          style={{
            position: 'relative',
            display: 'flex',
            height: '32px',
            // backgroundColor: '#F0F1F2',
          }}
        >
          {/* Sticky floating label */}
          <div
            // className="sticky left-0 z-40 flex w-24 shrink-0 items-center justify-center border-b border-solid text-sm font-bold"
            style={{
              position: 'sticky',
              left: 0,
              zIndex: 40,
              display: 'flex',
              width: '96px',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F0F1F2',
              // borderBottom: '1px solid #D6D6D8',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {stickyLabel}
          </div>
          {/* Scrollable header cells */}
          <div
            style={{
              display: 'flex',
            }}
          >
            {mergedGroupsWithLeft.map((group, idx) => {
              return (
                <div
                  key={idx}
                  // className="border-b border-solid py-2 pr-4 text-left text-sm font-bold"
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textAlign: 'left',
                    width: `${group.widthPx}px`,
                    // borderBottom: '1px solid #D6D6D8',
                    backgroundColor: '#F0F1F2',
                  }}
                >
                  <p
                    // className="px-4"
                    style={{
                      margin: 0,
                      padding: '0 16px',
                    }}
                  >
                    {idx === 0 ? '' : group.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom tick row */}
        <div
          // className="flex"
          style={{
            borderTop: '1px solid #D6D6D8',
            display: 'flex',
          }}
        >
          <div>
            {draggingBarDateRange && (
              <div
                style={{
                  position: 'absolute',
                  left: `${draggingBarDateRange.barLeft}px`,
                  top: '32px',
                  zIndex: 60,
                  backgroundColor: '#D6D6D8',
                  width: `${draggingBarDateRange.barWidth}px`,
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '100px',
                  opacity: 0.7,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'between',
                  }}
                ></div>
              </div>
            )}
          </div>
          {bottomRowCells.map((cell, idx) => {
            const tickLabel = config.formatTickLabel?.(cell.startDate) || '';
            const bottomRowCellKey = `bottom-row-${cell.startDate}-${idx}`;

            return (
              <div
                key={bottomRowCellKey}
                style={{
                  position: 'relative',
                  padding: '4px 0',
                  textAlign: 'center',
                  fontSize: '12px',
                  width: `${cell.widthPx}px`,
                }}
              >
                {tickLabel}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GanttChartHeader;
