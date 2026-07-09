import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";

export function CompareTableComponent({ node, updateAttributes }: NodeViewProps) {
  const { caption, columns, rows } = node.attrs as {
    caption: string;
    columns: string[];
    rows: string[][];
  };

  const [localCaption, setLocalCaption] = useState(caption || "");
  const [localColumns, setLocalColumns] = useState<string[]>(columns || []);
  const [localRows, setLocalRows] = useState<string[][]>(rows || []);

  useEffect(() => {
    setLocalCaption(caption || "");
    setLocalColumns(columns || []);
    setLocalRows(rows || []);
  }, [caption, columns, rows]);

  const sync = (
    nextCaption: string = localCaption,
    nextCols: string[] = localColumns,
    nextRows: string[][] = localRows,
  ) => {
    updateAttributes({
      caption: nextCaption,
      columns: nextCols,
      rows: nextRows,
    });
  };

  const updateCol = (index: number, value: string) => {
    const nextCols = [...localColumns];
    nextCols[index] = value;
    setLocalColumns(nextCols);
    sync(localCaption, nextCols, localRows);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = localRows.map((row, ri) =>
      ri === rowIndex
        ? row.map((cell, ci) => (ci === colIndex ? value : cell))
        : row,
    );
    setLocalRows(nextRows);
    sync(localCaption, localColumns, nextRows);
  };

  const addColumn = () => {
    const nextCols = [...localColumns, ""];
    const nextRows = localRows.map((row) => [...row, ""]);
    setLocalColumns(nextCols);
    setLocalRows(nextRows);
    sync(localCaption, nextCols, nextRows);
  };

  const removeColumn = () => {
    if (localColumns.length <= 1) return;
    const nextCols = localColumns.slice(0, -1);
    const nextRows = localRows.map((row) => row.slice(0, -1));
    setLocalColumns(nextCols);
    setLocalRows(nextRows);
    sync(localCaption, nextCols, nextRows);
  };

  const addRow = () => {
    const nextRows = [...localRows, Array(localColumns.length).fill("")];
    setLocalRows(nextRows);
    sync(localCaption, localColumns, nextRows);
  };

  const removeRow = () => {
    if (localRows.length <= 1) return;
    const nextRows = localRows.slice(0, -1);
    setLocalRows(nextRows);
    sync(localCaption, localColumns, nextRows);
  };

  return (
    <NodeViewWrapper className="editor-compare-table" data-type="compareTable">
      <figcaption contentEditable={false}>
        <input
          type="text"
          value={localCaption}
          onChange={(e) => setLocalCaption(e.target.value)}
          onBlur={() => sync()}
          placeholder="Подпись к таблице"
          className="editor-compare-table__caption"
        />
      </figcaption>
      <table contentEditable={false}>
        <thead>
          <tr>
            {localColumns.map((col, i) => (
              <th key={i}>
                <input
                  type="text"
                  value={col}
                  onChange={(e) => updateCol(i, e.target.value)}
                  placeholder={`Колонка ${i + 1}`}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {localRows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => updateCell(ri, ci, e.target.value)}
                    placeholder="—"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="editor-compare-table__controls" contentEditable={false}>
        <button type="button" onClick={addColumn}>
          + колонка
        </button>
        <button type="button" onClick={removeColumn}>
          − колонка
        </button>
        <button type="button" onClick={addRow}>
          + строка
        </button>
        <button type="button" onClick={removeRow}>
          − строка
        </button>
      </div>
    </NodeViewWrapper>
  );
}
