import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BarChart, DonutChart, LineChart } from "./service.ts";

afterEach(cleanup);

describe("charts", () => {
  const days = ["20 Nov", "21 Nov", "22 Nov"];

  it("name the picture and give its numbers as a table, with units and a legend", async () => {
    render(
      <LineChart
        label="Tasks per day"
        unit="tasks"
        labels={days}
        series={[
          { name: "Created", values: [1, 0, 3], color: "blue" },
          { name: "Finished", values: [0, 2, 1], color: "green" },
        ]}
      />,
    );
    expect(await screen.findByRole("img", { name: "Tasks per day" })).toBeTruthy();
    const table = screen.getByRole("table", { name: "Tasks per day, as numbers" });
    expect(
      within(table)
        .getAllByRole("row")
        .map((row) => row.textContent),
    ).toEqual(["WhenCreatedFinished", "20 Nov1 tasks0 tasks", "21 Nov0 tasks2 tasks", "22 Nov3 tasks1 tasks"]);
    // The legend names each line beside the picture, apart from the table's own headers.
    expect(screen.getAllByText("Created")).toHaveLength(2);
    expect(screen.getAllByText("Finished")).toHaveLength(2);
  });

  it("say so instead of drawing a flat line, or a line of one point", () => {
    const { rerender } = render(
      <LineChart label="Open" emptyText="Nothing open" labels={days} series={[{ name: "Open", values: [0, 0, 0], color: "orange" }]} />,
    );
    expect(screen.getByText("Nothing open")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    rerender(
      <LineChart label="Open" emptyText="Nothing open" labels={["20 Nov"]} series={[{ name: "Open", values: [4], color: "orange" }]} />,
    );
    expect(screen.getByText("Nothing open")).toBeTruthy();
  });

  it("draw one bar as a bar, and a donut with its parts as numbers", async () => {
    render(
      <>
        <BarChart label="Hours" labels={["20 Nov"]} series={[{ name: "Hours", values: [2.5], color: "blue" }]} />
        <DonutChart
          label="By lane"
          centre="50%"
          slices={[
            { name: "To do", value: 2, color: "blue" },
            { name: "Done", value: 2, color: "green" },
          ]}
        />
      </>,
    );
    expect(await screen.findByRole("img", { name: "Hours" })).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "By lane, as numbers" }))
        .getAllByRole("row")
        .map((row) => row.textContent),
    ).toEqual(["PartCount", "To do2", "Done2"]);
  });
});
