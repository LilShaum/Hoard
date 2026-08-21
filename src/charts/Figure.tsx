import { useId, useState, type ReactNode } from 'react'

/**
 * Every chart in the app is wrapped in this.
 *
 * It supplies the two things a chart is not allowed to ship without: a title
 * that names the single series (so no legend box is needed for one series), and
 * a table view carrying the same numbers — because a value that can only be
 * reached by hovering is a value some readers cannot reach at all.
 */

export type TableSpec = {
  columns: string[]
  rows: Array<Array<string | number>>
}

type Props = {
  title: string
  /** Shown to the right of the title — usually the headline figure. */
  meta?: ReactNode
  table: TableSpec
  children: ReactNode
  /** Legend entries, for charts with more than one mark type. */
  legend?: Array<{ label: string; color: string; dashed?: boolean }>
}

export function Figure({ title, meta, table, children, legend }: Props) {
  const id = useId()
  const [showTable, setShowTable] = useState(false)

  return (
    <figure className="figure panel">
      <figcaption className="panel__head">
        <span className="label">{title}</span>
        <span className="row row--tight">
          {meta}
          <button
            className="btn btn--link"
            aria-expanded={showTable}
            aria-controls={`${id}-table`}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? 'Chart' : 'Table'}
          </button>
        </span>
      </figcaption>

      <div className="panel__body">
        {showTable ? (
          <div className="tablewrap" id={`${id}-table`}>
            <table className="datatable">
              <thead>
                <tr>{table.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((cell, j) => (
                      j === 0
                        ? <th key={j} scope="row">{cell}</th>
                        : <td key={j} className="num">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            {children}
            {legend && legend.length > 0 && (
              <ul className="legend">
                {legend.map((l) => (
                  <li key={l.label}>
                    <span
                      className={`legend__mark ${l.dashed ? 'legend__mark--dash' : ''}`}
                      style={{ background: l.dashed ? undefined : l.color, borderColor: l.color }}
                      aria-hidden
                    />
                    {l.label}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </figure>
  )
}

/** Shared hover/focus tooltip state for a chart's marks. */
export function useHovered<T>() {
  const [hovered, setHovered] = useState<{ index: number; datum: T } | null>(null)
  return {
    hovered,
    show: (index: number, datum: T) => setHovered({ index, datum }),
    clear: () => setHovered(null),
  }
}
