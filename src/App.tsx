import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import './App.css'

type FurnitureItem = {
  id: string
  name: string
  w: number
  d: number
  h: number
  x: number
  y: number
  rotated: boolean
  color: string
}

const DEFAULT_ITEMS: FurnitureItem[] = [
  {
    id: 'tv',
    name: 'テレビ台',
    w: 115,
    d: 35,
    h: 36.8,
    x: 40,
    y: 40,
    rotated: false,
    color: '#ffb257',
  },
  {
    id: 'table',
    name: 'ローテーブル',
    w: 100,
    d: 60,
    h: 38,
    x: 220,
    y: 140,
    rotated: false,
    color: '#7cc7b8',
  },
  {
    id: 'sofa',
    name: 'ソファー',
    w: 243,
    d: 103,
    h: 81,
    x: 60,
    y: 280,
    rotated: false,
    color: '#f07b7b',
  },
]

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const PX_PER_CM = 130 / 287
const IMAGE_WIDTH_PX = 287
const IMAGE_HEIGHT_PX = 409
const BOARD_W_CM = IMAGE_WIDTH_PX / PX_PER_CM
const BOARD_H_CM = IMAGE_HEIGHT_PX / PX_PER_CM
const GRID_CM = 50
function App() {
  const [items, setItems] = useState<FurnitureItem[]>(DEFAULT_ITEMS)
  const [selectedId, setSelectedId] = useState(DEFAULT_ITEMS[0]?.id ?? '')
  const [dragId, setDragId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newWidth, setNewWidth] = useState('')
  const [newDepth, setNewDepth] = useState('')
  const [newHeight, setNewHeight] = useState('')
  const [newColor, setNewColor] = useState('#b7c8f2')
  const [hasFloorplan, setHasFloorplan] = useState(true)

  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const boardRef = useRef<HTMLDivElement | null>(null)

  const selectedItem = items.find((item) => item.id === selectedId)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setHasFloorplan(true)
    img.onerror = () => setHasFloorplan(false)
    img.src = '/floorplan.png'
  }, [])

  useEffect(() => {
    if (!dragId) {
      return
    }

    const handleMove = (event: PointerEvent) => {
      if (!boardRef.current) {
        return
      }

      const rect = boardRef.current.getBoundingClientRect()
      const xPx = event.clientX - rect.left - dragOffsetRef.current.x
      const yPx = event.clientY - rect.top - dragOffsetRef.current.y

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== dragId) {
            return item
          }

          const widthCm = item.rotated ? item.d : item.w
          const depthCm = item.rotated ? item.w : item.d
          const maxX = Math.max(0, BOARD_W_CM - widthCm)
          const maxY = Math.max(0, BOARD_H_CM - depthCm)
          const nextX = clamp(xPx / PX_PER_CM, 0, maxX)
          const nextY = clamp(yPx / PX_PER_CM, 0, maxY)

          return { ...item, x: nextX, y: nextY }
        })
      )
    }

    const handleUp = () => setDragId(null)

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [dragId])

  const gridStyle = useMemo(() => {
    const gridPx = GRID_CM * PX_PER_CM
    return {
      backgroundSize: `${gridPx}px ${gridPx}px`,
    }
  }, [])

  const boardStyle = {
    width: `${IMAGE_WIDTH_PX}px`,
    height: `${IMAGE_HEIGHT_PX}px`,
  }

  const floorplanStyle = {
    backgroundImage: `url('/floorplan.png')`,
    backgroundSize: '100% 100%',
    backgroundPosition: '0 0',
    opacity: 1,
  }

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    id: string
  ) => {
    if (!boardRef.current) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const itemRect = event.currentTarget.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - itemRect.left,
      y: event.clientY - itemRect.top,
    }

    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id)
      const picked = prev.find((item) => item.id === id)
      return picked ? [...next, picked] : prev
    })
    setSelectedId(id)
    setDragId(id)
  }

  const rotateSelected = () => {
    if (!selectedItem) {
      return
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? { ...item, rotated: !item.rotated }
          : item
      )
    )
  }

  const resetLayout = () => {
    setItems(DEFAULT_ITEMS)
  }

  const addFurniture = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const width = Number(newWidth)
    const depth = Number(newDepth)
    const height = Number(newHeight)

    if (!newName.trim() || width <= 0 || depth <= 0 || height <= 0) {
      return
    }

    const id = `${Date.now()}-${Math.round(Math.random() * 1000)}`
    setItems((prev) => [
      ...prev,
      {
        id,
        name: newName.trim(),
        w: width,
        d: depth,
        h: height,
        x: 10,
        y: 10,
        rotated: false,
        color: newColor,
      },
    ])
    setNewName('')
    setNewWidth('')
    setNewDepth('')
    setNewHeight('')
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">間取りシミュレーター</p>
          <h1>家具レイアウト 2D</h1>
          <p className="subtitle">
            家具をドラッグして配置できます。単位はcm、回転は90°です。
          </p>
        </div>
        <div className="status">
          <div className="status-card">
            <span>スケール</span>
            <strong>{PX_PER_CM.toFixed(3)} px/cm</strong>
          </div>
          <div className="status-card">
            <span>基準</span>
            <strong>
              287 cm = 130 px
            </strong>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="workspace">
          <div className="plan-frame">
            <div
              className="plan"
              ref={boardRef}
              style={boardStyle}
              role="presentation"
            >
              <div className="plan-image" style={floorplanStyle} />
              <div className="grid" style={gridStyle} />
              {!hasFloorplan && (
                <div className="missing-image">
                  <p>画像を配置してください</p>
                  <strong>/public/floorplan.png</strong>
                </div>
              )}
              {items.map((item) => {
                const widthCm = item.rotated ? item.d : item.w
                const depthCm = item.rotated ? item.w : item.d
                const isSelected = item.id === selectedId

                return (
                  <div
                    key={item.id}
                    className={`furniture ${isSelected ? 'selected' : ''}`}
                    style={{
                      width: `${widthCm * PX_PER_CM}px`,
                      height: `${depthCm * PX_PER_CM}px`,
                      transform: `translate(${item.x * PX_PER_CM}px, ${item.y * PX_PER_CM}px)`,
                      background: item.color,
                    }}
                    onPointerDown={(event) => handlePointerDown(event, item.id)}
                  >
                    <span className="furniture-sr">
                      {item.name} {widthCm} × {depthCm} cm
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-card">
            <h2>家具</h2>
            <div className="furniture-list">
              {items.map((item) => {
                const widthCm = item.rotated ? item.d : item.w
                const depthCm = item.rotated ? item.w : item.d
                const isSelected = item.id === selectedId

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`list-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span
                      className="list-color"
                      style={{ background: item.color }}
                    />
                    <span>{item.name}</span>
                    <span>
                      {widthCm} × {depthCm} cm
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="panel-actions">
              <button type="button" onClick={rotateSelected}>
                90°回転
              </button>
              <button type="button" onClick={resetLayout}>
                初期配置に戻す
              </button>
            </div>
          </div>

          <div className="panel-card">
            <h2>家具を追加</h2>
            <form className="add-form" onSubmit={addFurniture}>
              <label>
                名前
                <input
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="例: ラック"
                />
              </label>
              <div className="add-grid">
                <label>
                  幅 (cm)
                  <input
                    type="number"
                    min={1}
                    value={newWidth}
                    onChange={(event) => setNewWidth(event.target.value)}
                  />
                </label>
                <label>
                  奥行 (cm)
                  <input
                    type="number"
                    min={1}
                    value={newDepth}
                    onChange={(event) => setNewDepth(event.target.value)}
                  />
                </label>
                <label>
                  高さ (cm)
                  <input
                    type="number"
                    min={1}
                    value={newHeight}
                    onChange={(event) => setNewHeight(event.target.value)}
                  />
                </label>
              </div>
              <label className="color-field">
                色
                <input
                  type="color"
                  value={newColor}
                  onChange={(event) => setNewColor(event.target.value)}
                />
              </label>
              <button type="submit">追加</button>
            </form>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
