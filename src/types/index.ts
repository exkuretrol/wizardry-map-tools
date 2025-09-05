export interface Tile {
  id: string
  name: string
  image: string
  category: string
  // Unity sprite atlas data
  textureRect: {
    x: number
    y: number
    width: number
    height: number
  }
}

// Simplified Tile Atlas Types
export interface TileAtlasData {
  tiles: TileMetadata[]
}

export interface TileMetadata {
  name: string
  x: number
  y: number
  width: number
  height: number
}

export interface MapData {
  id: string
  name: string
  width: number
  height: number
  tileSize: number
  mapId?: string // Optional for backward compatibility
  layers: TileLayer[]
}

export interface TileLayer {
  id: string
  name: string
  tiles: (string | null)[][] // tile IDs in grid format
  visible: boolean
  opacity: number
  type?: 'tiles' | 'comments' // Layer type - default is 'tiles' for backward compatibility
  arrows?: CommentArrow[] // Comment arrows for comment layers
}

export interface MapPosition {
  x: number
  y: number
}

export interface MapMarker {
  id: string
  position: MapPosition
  label: string
  color: string
  timestamp: number
}

export interface Route {
  id: string
  name: string
  waypoints: MapPosition[]
  markers: MapMarker[]
  created: number
}

export interface CommentArrow {
  id: string
  points: MapPosition[] // Array of points including start, breakpoints, and end
  color: string
  thickness: number
  timestamp: number
}