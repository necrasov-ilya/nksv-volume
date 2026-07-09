import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useCallback, useEffect, useReducer } from 'react';

interface CompareTableAttrs {
  caption: string;
  columns: string[];
  rows: string[][];
}

type State = CompareTableAttrs;

type Action =
  | { type: 'hydrate'; payload: CompareTableAttrs }
  | { type: 'setCaption'; value: string }
  | { type: 'setColumn'; index: number; value: string }
  | { type: 'setCell'; row: number; col: number; value: string }
  | { type: 'addColumn' }
  | { type: 'removeColumn' }
  | { type: 'addRow' }
  | { type: 'removeRow' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return {
        caption: action.payload.caption || '',
        columns: [...action.payload.columns],
        rows: action.payload.rows.map((row) => [...row]),
      };
    case 'setCaption':
      return { ...state, caption: action.value };
    case 'setColumn': {
      const columns = [...state.columns];
      columns[action.index] = action.value;
      return { ...state, columns };
    }
    case 'setCell': {
      const rows = state.rows.map((row, ri) => {
        if (ri !== action.row) return row;
        const next = [...row];
        next[action.col] = action.value;
        return next;
      });
      return { ...state, rows };
    }
    case 'addColumn': {
      const columns = [...state.columns, ''];
      const rows = state.rows.map((row) => [...row, '']);
      return { ...state, columns, rows };
    }
    case 'removeColumn': {
      if (state.columns.length <= 1) return state;
      const columns = state.columns.slice(0, -1);
      const rows = state.rows.map((row) => row.slice(0, -1));
      return { ...state, columns, rows };
    }
    case 'addRow': {
      const rows = [...state.rows, Array<string>(state.columns.length).fill('')];
      return { ...state, rows };
    }
    case 'removeRow': {
      if (state.rows.length <= 1) return state;
      return { ...state, rows: state.rows.slice(0, -1) };
    }
    default:
      return state;
  }
}

const initialState: State = { caption: '', columns: [], rows: [] };

export function CompareTableComponent({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as CompareTableAttrs;
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'hydrate', payload: attrs });
  }, [attrs.caption, attrs.columns, attrs.rows]);

  useEffect(() => {
    updateAttributes({
      caption: state.caption,
      columns: state.columns,
      rows: state.rows,
    });
  }, [state.caption, state.columns, state.rows, updateAttributes]);

  const onCaptionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'setCaption', value: event.target.value });
  }, []);

  const onColumnChange = useCallback((index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'setColumn', index, value: event.target.value });
  }, []);

  const onCellChange = useCallback((row: number, col: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'setCell', row, col, value: event.target.value });
  }, []);

  return (
    <NodeViewWrapper className="editor-compare-table" data-type="compareTable">
      <CompareTableCaption value={state.caption} onChange={onCaptionChange} />
      <CompareTableGrid
        columns={state.columns}
        rows={state.rows}
        onColumnChange={onColumnChange}
        onCellChange={onCellChange}
      />
      <CompareTableControls
        onAddColumn={() => dispatch({ type: 'addColumn' })}
        onRemoveColumn={() => dispatch({ type: 'removeColumn' })}
        onAddRow={() => dispatch({ type: 'addRow' })}
        onRemoveRow={() => dispatch({ type: 'removeRow' })}
      />
    </NodeViewWrapper>
  );
}

interface CompareTableCaptionProps {
  value: string;
  onChange(event: React.ChangeEvent<HTMLInputElement>): void;
}

function CompareTableCaption({ value, onChange }: CompareTableCaptionProps) {
  return (
    <figcaption contentEditable={false}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Подпись к таблице"
        className="editor-compare-table__caption"
        aria-label="Подпись к таблице"
      />
    </figcaption>
  );
}

interface CompareTableGridProps {
  columns: string[];
  rows: string[][];
  onColumnChange(index: number): (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCellChange(row: number, col: number): (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function CompareTableGrid({ columns, rows, onColumnChange, onCellChange }: CompareTableGridProps) {
  return (
    <table contentEditable={false}>
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i}>
              <input
                type="text"
                value={col}
                onChange={onColumnChange(i)}
                placeholder={`Колонка ${i + 1}`}
                aria-label={`Заголовок колонки ${i + 1}`}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci}>
                <input
                  type="text"
                  value={cell}
                  onChange={onCellChange(ri, ci)}
                  placeholder="—"
                  aria-label={`Строка ${ri + 1}, колонка ${ci + 1}`}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface CompareTableControlsProps {
  onAddColumn(): void;
  onRemoveColumn(): void;
  onAddRow(): void;
  onRemoveRow(): void;
}

function CompareTableControls({ onAddColumn, onRemoveColumn, onAddRow, onRemoveRow }: CompareTableControlsProps) {
  return (
    <div className="editor-compare-table__controls" contentEditable={false}>
      <button type="button" onClick={onAddColumn} aria-label="Добавить колонку">+ колонка</button>
      <button type="button" onClick={onRemoveColumn} aria-label="Удалить колонку">− колонка</button>
      <button type="button" onClick={onAddRow} aria-label="Добавить строку">+ строка</button>
      <button type="button" onClick={onRemoveRow} aria-label="Удалить строку">− строка</button>
    </div>
  );
}
