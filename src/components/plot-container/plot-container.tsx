import "./plot-container.css";

import { throttle } from "lodash";
import {
  createRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { THROTTLE_INTERVAL } from "../../constants";
import { Core } from "../../core";
import { asyncSnapshot } from "../../helpers";
import { Bounds, ChartElement, Scenegraph, Viewport } from "../../types";
import { FcElement, Interval } from "../../types";
import { PaneView } from "../pane-view";
import { SplitView } from "../split-view";
import { XAxisView } from "../x-axis-view";

export type PlotContainerProps = {
  width: number;
  height: number;
  decimalPlaces: number;
  scenegraph: Scenegraph;
  interval: Interval;
  initialViewport: Viewport;
  overlays: string[];
  proportion: number;
  onViewportChanged?: (viewport: Viewport) => void;
  onRightClick?: (position: [number, number]) => void;
  onGetDataRange?: (from: Date, to: Date, interval: Interval) => void;
  onClosePane: (id: string) => void;
  onProportionChanged: (proportion: number) => void;
};

export const PlotContainer = forwardRef<ChartElement, PlotContainerProps>(
  (
    {
      scenegraph,
      interval,
      initialViewport,
      decimalPlaces,
      overlays,
      proportion,
      onViewportChanged = () => {},
      onGetDataRange = () => {},
      onClosePane,
      onProportionChanged,
    },
    ref
  ) => {
    useImperativeHandle(ref, () => ({
      panBy: (n: number) => {
        chartElement.current?.panBy(n);
      },
      reset: () => {
        chartElement.current?.reset();
      },
      snapshot: async () => {
        return snapshot();
      },
      zoomIn: (delta: number) => {
        chartElement.current?.zoomIn(delta);
      },
      zoomOut: (delta: number) => {
        chartElement.current?.zoomOut(delta);
      },
    }));

    const onViewportChangedThrottled = useMemo(
      () => throttle(onViewportChanged, 200),
      [onViewportChanged]
    );

    const onGetDataRangeThrottled = useMemo(
      () => throttle(onGetDataRange, 800),
      [onGetDataRange]
    );

    const snapshot = useCallback(() => asyncSnapshot(chartRef), []);
    const [bounds, setBounds] = useState<Bounds | null>(null);
    const [dataIndex, setDataIndex] = useState<number | null>(null);
    const [showPaneControls, setShowPaneControls] = useState<string | null>(
      null
    );
    const chartRef = useRef<FcElement>(null!);
    const xAxisRef = useRef<HTMLDivElement>(null!);

    const handleBoundsChanged = useMemo(
      () => throttle(setBounds, THROTTLE_INTERVAL),
      []
    );

    const handleDataIndexChanged = useMemo(
      () => throttle(setDataIndex, THROTTLE_INTERVAL),
      []
    );

    const handleViewportChanged = useMemo(
      () => throttle(onViewportChanged, THROTTLE_INTERVAL),
      [onViewportChanged]
    );

    const refs = useMemo(
      () =>
        scenegraph.panes
          .map((pane) => pane.id)
          .reduce((acc, value) => {
            acc[value] = createRef<HTMLDivElement>();
            return acc;
          }, {} as { [index: string]: React.RefObject<HTMLDivElement> }),
      [scenegraph.panes]
    );

    const chartElement = useRef<Core | null>(null);

    useEffect(() => {
      chartElement.current = new Core(
        Object.fromEntries(
          scenegraph.panes.map((pane) => [
            pane.id,
            {
              id: String(pane.id),
              ref: refs[pane.id],
              data: pane.originalData,
              renderableElements: pane.renderableElements.flat(1),
              yEncodingFields: pane.yEncodingFields,
              labels: pane.labels ?? [],
              labelLines: pane.labelLines ?? [],
            },
          ])
        ),
        {
          ref: xAxisRef,
          data: scenegraph.panes[0].originalData.map((d) => d.date),
        },
        initialViewport,
        decimalPlaces
      )
        .interval(interval)
        .on("redraw", () => {
          chartRef.current?.requestRedraw();
        })
        .on("bounds_changed", (bounds: Bounds) => {
          handleBoundsChanged(bounds);
        })
        .on("viewport_changed", (viewport: Viewport) => {
          handleViewportChanged(viewport);
        })
        .on("mousemove", (index: number, id: string) => {
          handleDataIndexChanged(index);
        })
        .on("mouseout", () => {
          handleDataIndexChanged(null);
        })
        .on("fetch_data", (from: Date, to: Date) => {
          onGetDataRangeThrottled(from, to, interval);
        });

      chartRef.current?.requestRedraw();

      requestAnimationFrame(() =>
        chartElement.current?.initialize(initialViewport)
      );

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update interval and fetch data callback
    useEffect(() => {
      if (chartElement.current) {
        chartElement.current
          .interval(interval)
          .on("fetch_data", (from: Date, to: Date) => {
            onGetDataRangeThrottled(from, to, interval);
          });
      }
    }, [interval, onGetDataRangeThrottled]);

    useEffect(() => {
      if (chartElement.current) {
        chartElement.current.update(
          Object.fromEntries(
            scenegraph.panes.map((pane) => [
              pane.id,
              {
                id: String(pane.id),
                ref: refs[pane.id],
                data: pane.originalData,
                renderableElements: pane.renderableElements.flat(1),
                yEncodingFields: pane.yEncodingFields,
                labels: pane.labels ?? [],
                labelLines: pane.labelLines ?? [],
              },
            ])
          ),
          {
            ref: xAxisRef,
            data: scenegraph.panes[0].originalData.map((d) => d.date),
          }
        );

        chartRef.current?.requestRedraw();
      }
    }, [chartElement, refs, scenegraph.panes]);

    useEffect(() => {
      if (chartElement.current) {
        chartElement.current.interval(interval);
      }
    }, [interval]);

    const showStudy = scenegraph.panes.length === 2;

    return (
      <d3fc-group ref={chartRef} class="plot-container__chart">
        <SplitView
          main={
            <PaneView
              ref={refs[scenegraph.panes[0].id]}
              bounds={bounds}
              dataIndex={dataIndex}
              decimalPlaces={decimalPlaces}
              overlays={overlays}
              pane={scenegraph.panes[0]}
              onClosePane={onClosePane}
            />
          }
          study={
            showStudy ? (
              <PaneView
                ref={refs[scenegraph.panes[1].id]}
                bounds={bounds}
                dataIndex={dataIndex}
                decimalPlaces={decimalPlaces}
                overlays={overlays}
                pane={scenegraph.panes[1]}
                onClosePane={onClosePane}
              />
            ) : (
              <div>No study selected</div>
            )
          }
          showStudy={showStudy}
          initialProportion={proportion}
          onResize={(proportion: number) => {
            chartRef.current?.requestRedraw();
            onProportionChanged(proportion);
          }}
        />
        <XAxisView ref={xAxisRef} />
      </d3fc-group>
    );
  }
);
