"use client";

import { useState } from "react";
import { parseWidgetSize } from "@dashvu/core";

import type { WidgetComponentProps } from "@/types/widget";
import { cn } from "@/lib/utils";

function formatNumber(n: number): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "Error";
  if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-12 && n !== 0)) {
    return n.toExponential(6);
  }
  const s = n.toFixed(10).replace(/\.?0+$/, "");
  if (s.length > 14) {
    return n.toExponential(6);
  }
  return s;
}

const factorial = (n: number): number => {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
};

const CalculatorWidget: React.FC<WidgetComponentProps> = ({ className, size }) => {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [angleMode, setAngleMode] = useState<"rad" | "deg">("deg");

  const showSci = parseWidgetSize(size).width >= 2;
  const keyCol = (offset: number) => (showSci ? 4 + offset : 1 + offset);

  const inputDigit = (d: string) => {
    if (waitingForOperand) {
      setDisplay(d);
      setWaitingForOperand(false);
      return;
    }
    setDisplay(display === "0" || display === "Error" ? d : display + d);
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (display === "Error") {
      setDisplay("0.");
      return;
    }
    if (!display.includes(".") && !display.endsWith("e")) {
      setDisplay(display + ".");
    }
  };

  const inputExp = () => {
    if (display === "Error" || /[eE]/.test(display)) return;
    if (waitingForOperand || display === "0") {
      setDisplay("1e");
      setWaitingForOperand(false);
      return;
    }
    setDisplay(display + "e");
  };

  const percent = () => {
    const value = parseFloat(display);
    if (Number.isNaN(value)) return;
    setDisplay(formatNumber(value / 100));
    setWaitingForOperand(true);
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    if (Number.isNaN(value)) return;
    setDisplay(formatNumber(-value));
  };

  const clearAll = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setWaitingForOperand(false);
  };

  const clearEntry = () => {
    setDisplay("0");
    setWaitingForOperand(false);
  };

  const backspace = () => {
    if (waitingForOperand) {
      setDisplay("0");
      setWaitingForOperand(false);
      return;
    }
    if (display === "Error") {
      setDisplay("0");
      return;
    }
    setDisplay(display.length === 1 ? "0" : display.slice(0, -1));
  };

  const compute = (a: number, b: number, o: string): number => {
    switch (o) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "×":
      case "*":
        return a * b;
      case "^":
        return Math.pow(a, b);
      case "÷":
      case "/":
        if (b === 0) return NaN;
        return a / b;
      default:
        return b;
    }
  };

  const performOp = (nextOp: string) => {
    const current = parseFloat(display);
    if (Number.isNaN(current) || display === "Error") return;

    if (prev === null) {
      setPrev(current);
      setOp(nextOp);
      setWaitingForOperand(true);
      return;
    }

    if (op) {
      const result = compute(prev, current, op);
      setPrev(result);
      setDisplay(formatNumber(result));
      setOp(nextOp);
      setWaitingForOperand(true);
      return;
    }

    setOp(nextOp);
    setPrev(current);
    setWaitingForOperand(true);
  };

  const equals = () => {
    if (op === null || prev === null) return;
    const current = parseFloat(display);
    if (Number.isNaN(current) || display === "Error") return;
    const result = compute(prev, current, op);
    setDisplay(formatNumber(result));
    setPrev(null);
    setOp(null);
    setWaitingForOperand(true);
  };

  const applyUnary = (fn: (x: number) => number) => {
    const value = parseFloat(display);
    if (Number.isNaN(value) || display === "Error") return;
    const result = fn(value);
    setDisplay(formatNumber(result));
    setPrev(null);
    setOp(null);
    setWaitingForOperand(true);
  };

  const toRad = (x: number) => (angleMode === "deg" ? (x * Math.PI) / 180 : x);

  const baseBtn =
    "flex h-full w-full items-center justify-center rounded-md border border-border bg-muted/60 text-[9px] font-medium shadow-sm transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring active:bg-accent min-w-0 min-h-0 overflow-hidden sm:text-[10px] md:text-xs";
  const fnBtn = cn(baseBtn, "bg-muted/40");
  const opBtn = cn(baseBtn, "bg-accent/60 hover:bg-accent");
  const eqBtn = cn(baseBtn, "bg-primary/20 hover:bg-primary/30");
  const numBtn = baseBtn;

  const gridCols = showSci ? "repeat(7, 1fr)" : "repeat(4, 1fr)";

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-1 overflow-hidden sm:gap-1.5", className)}>
      <div className="flex items-end justify-end rounded-md border border-border bg-background/60 px-2 py-1 sm:px-3 sm:py-1.5">
        <div className="max-w-full truncate text-right text-base font-semibold tabular-nums sm:text-lg md:text-xl">
          {display}
        </div>
      </div>

      <div
        className="grid flex-1 min-h-0 auto-rows-fr gap-1 overflow-hidden sm:gap-1.5"
        style={{ gridTemplateColumns: gridCols }}
      >
        {showSci ? (
          <>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 1, gridRow: 1 }}
              onClick={() => setAngleMode(angleMode === "deg" ? "rad" : "deg")}
            >
              {angleMode.toUpperCase()}
            </button>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 2, gridRow: 1 }}
              onClick={() => applyUnary(() => Math.E)}
            >
              e
            </button>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 3, gridRow: 1 }}
              onClick={() => applyUnary((x) => Math.log10(x))}
            >
              log
            </button>

            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 1, gridRow: 2 }}
              onClick={() => applyUnary((x) => Math.sin(toRad(x)))}
            >
              sin
            </button>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 2, gridRow: 2 }}
              onClick={inputExp}
            >
              EXP
            </button>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 3, gridRow: 2 }}
              onClick={() => applyUnary((x) => Math.log(x))}
            >
              ln
            </button>

            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 1, gridRow: 3 }}
              onClick={() => applyUnary((x) => Math.cos(toRad(x)))}
            >
              cos
            </button>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 2, gridRow: 3 }}
              onClick={() => performOp("^")}
            >
              xʸ
            </button>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 3, gridRow: 3 }}
              onClick={() => applyUnary((x) => 1 / x)}
            >
              1/x
            </button>

            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 1, gridRow: 4 }}
              onClick={() => applyUnary((x) => Math.tan(toRad(x)))}
            >
              tan
            </button>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 2, gridRow: 4 }}
              onClick={() => applyUnary((x) => Math.sqrt(x))}
            >
              √
            </button>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 3, gridRow: 4 }}
              onClick={() => applyUnary(factorial)}
            >
              x!
            </button>

            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 1, gridRow: 5 }}
              onClick={() => applyUnary(() => Math.PI)}
            >
              π
            </button>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 2, gridRow: 5 }}
              onClick={() => applyUnary((x) => x * x)}
            >
              x²
            </button>
            <button
              type="button"
              className={fnBtn}
              style={{ gridColumn: 3, gridRow: 5 }}
              onClick={toggleSign}
            >
              ±
            </button>
          </>
        ) : null}

        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(0), gridRow: 1 }}
          onClick={clearAll}
        >
          AC
        </button>
        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(1), gridRow: 1 }}
          onClick={clearEntry}
        >
          CE
        </button>
        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(2), gridRow: 1 }}
          onClick={backspace}
        >
          ⌫
        </button>
        <button
          type="button"
          className={opBtn}
          style={{ gridColumn: keyCol(3), gridRow: 1 }}
          onClick={() => performOp("÷")}
        >
          ÷
        </button>

        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(0), gridRow: 2 }}
          onClick={() => inputDigit("7")}
        >
          7
        </button>
        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(1), gridRow: 2 }}
          onClick={() => inputDigit("8")}
        >
          8
        </button>
        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(2), gridRow: 2 }}
          onClick={() => inputDigit("9")}
        >
          9
        </button>
        <button
          type="button"
          className={opBtn}
          style={{ gridColumn: keyCol(3), gridRow: 2 }}
          onClick={() => performOp("×")}
        >
          ×
        </button>

        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(0), gridRow: 3 }}
          onClick={() => inputDigit("4")}
        >
          4
        </button>
        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(1), gridRow: 3 }}
          onClick={() => inputDigit("5")}
        >
          5
        </button>
        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(2), gridRow: 3 }}
          onClick={() => inputDigit("6")}
        >
          6
        </button>
        <button
          type="button"
          className={opBtn}
          style={{ gridColumn: keyCol(3), gridRow: 3 }}
          onClick={() => performOp("-")}
        >
          −
        </button>

        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(0), gridRow: 4 }}
          onClick={() => inputDigit("1")}
        >
          1
        </button>
        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(1), gridRow: 4 }}
          onClick={() => inputDigit("2")}
        >
          2
        </button>
        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(2), gridRow: 4 }}
          onClick={() => inputDigit("3")}
        >
          3
        </button>
        <button
          type="button"
          className={opBtn}
          style={{ gridColumn: keyCol(3), gridRow: 4 }}
          onClick={() => performOp("+")}
        >
          +
        </button>

        {showSci ? (
          <button
            type="button"
            className={numBtn}
            style={{ gridColumn: keyCol(0), gridRow: 5 }}
            onClick={percent}
          >
            %
          </button>
        ) : (
          <button
            type="button"
            className={numBtn}
            style={{ gridColumn: keyCol(0), gridRow: 5 }}
            onClick={toggleSign}
          >
            ±
          </button>
        )}
        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(1), gridRow: 5 }}
          onClick={() => inputDigit("0")}
        >
          0
        </button>
        <button
          type="button"
          className={numBtn}
          style={{ gridColumn: keyCol(2), gridRow: 5 }}
          onClick={inputDecimal}
        >
          .
        </button>
        <button
          type="button"
          className={eqBtn}
          style={{ gridColumn: keyCol(3), gridRow: 5 }}
          onClick={equals}
        >
          =
        </button>
      </div>
    </div>
  );
};

export default CalculatorWidget;
