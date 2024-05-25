import {
  AreaData,
  ColorType,
  Time,
  WhitespaceData,
  createChart,
} from "lightweight-charts";
import React, { useEffect, useRef } from "react";

/**
 * Renders a chart component.
 *
 * @param data - An array of data points for the chart.
 */
export const ChartComponent = ({
  data,
}: {
  data: (AreaData<Time> | WhitespaceData<Time>)[];
}) => {
  // Define colors for the chart
  const colors = {
    backgroundColor: "#111216",
    lineColor: "#c084fc",
    textColor: "white",
    areaTopColor: "rgba(139, 92, 246, 0.5)",
    areaBottomColor: "rgba(79,70,229,0.0)",
  };

  // Create a ref for the chart container
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the chart container ref is available
    if (chartContainerRef?.current === null) return;

    // Handle chart resize
    const handleResize = () => {
      if (chartContainerRef?.current === null) return;
      chart.applyOptions({ width: chartContainerRef?.current.clientWidth });
    };

    // Create the chart instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.backgroundColor },
        textColor: colors.textColor,
      },
      grid: {
        vertLines: { color: "#27272a" },
        horzLines: { color: "#27272a" },
      },
      width: chartContainerRef.current.clientWidth - 4,
      height: chartContainerRef.current.clientHeight - 4,
    });

    // Fit the time scale to the content
    chart.timeScale().fitContent();

    // Check if data is available
    if (data === undefined) return;

    // Add a new area series to the chart
    const newSeries = chart.addAreaSeries({
      lineColor: colors.lineColor,
      topColor: colors?.areaTopColor,
      lineWidth: 2,
      bottomColor: colors?.areaBottomColor,
    });

    // Set the data for the series
    newSeries.setData(data);

    // Add event listener for chart resize
    window.addEventListener("resize", handleResize);

    // Clean up event listener and remove the chart on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [
    data,
    colors.backgroundColor,
    colors.lineColor,
    colors.textColor,
    colors.areaTopColor,
    colors.areaBottomColor,
  ]);

  // Render the chart container
  return <div className="m-1 w-full h-full" ref={chartContainerRef}></div>;
};
