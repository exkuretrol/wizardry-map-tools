import { useRef, useEffect, useState } from 'react'
import type { MapData, Tile, MapPosition, CommentArrow } from '@/types'
import { tileLoader } from '@/utils/tileLoader'

interface TileCanvasProps {
  mapData: MapData
  selectedTile: Tile | null
  onMapDataChange: (mapData: MapData) => void
  onTileSelect: (tile: Tile) => void
  drawingMode: 'tile' | 'path'
  paths: Array<{x: number, y: number}>
  onPathsChange: (paths: Array<{x: number, y: number}>) => void
  placeOnPathOnly: boolean
  showGrid: boolean
  appMode: 'edit' | 'comment'
  isDrawingArrow: boolean
  onDrawingArrowChange: (isDrawing: boolean) => void
  currentArrowPoints: {x: number, y: number}[]
  onCurrentArrowPointsChange: (points: {x: number, y: number}[]) => void
  selectedArrowColor: string
}

const TileCanvas = ({ 
  mapData, selectedTile, onMapDataChange, onTileSelect, drawingMode, 
  paths, onPathsChange, placeOnPathOnly, showGrid, appMode, 
  isDrawingArrow, onDrawingArrowChange, currentArrowPoints, onCurrentArrowPointsChange, selectedArrowColor 
}: TileCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null)
  const [mousePosition, setMousePosition] = useState<{x: number, y: number} | null>(null)
  const [tileRotation, setTileRotation] = useState(0) // 0, 90, 180, 270 degrees
  const [processedCells, setProcessedCells] = useState<Set<string>>(new Set())

  // Calculate canvas size with maximum limit of 1080px (27 * 40px)
  const maxCanvasSize = 1080
  const originalWidth = mapData.width * mapData.tileSize
  const originalHeight = mapData.height * mapData.tileSize
  const maxDimension = Math.max(originalWidth, originalHeight)
  const scaleFactor = maxDimension > maxCanvasSize ? maxCanvasSize / maxDimension : 1
  
  const canvasWidth = originalWidth * scaleFactor
  const canvasHeight = originalHeight * scaleFactor

  // Load the Frame2.png image for the grid background
  useEffect(() => {
    const loadFrameImage = () => {
      const img = new Image()
      img.onload = () => {
        console.log('Frame2.png loaded:', img.width, 'x', img.height)
        setFrameImage(img)
      }
      img.onerror = (error) => {
        console.error('Failed to load Frame2.png:', error)
      }
      img.src = '/tiles/Frame2.png'
    }

    loadFrameImage()
  }, [])

  // Convert mouse coordinates to tile coordinates
  const getMouseTilePosition = (event: React.MouseEvent<HTMLCanvasElement>): MapPosition => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / scaleFactor  // Account for canvas scaling
    const y = (event.clientY - rect.top) / scaleFactor   // Account for canvas scaling
    
    return {
      x: Math.floor(x / mapData.tileSize),
      y: Math.floor(y / mapData.tileSize)
    }
  }

  // Check if position is valid for tile placement based on 3x3 pattern
  const isValidPlacement = (x: number, y: number): boolean => {
    const subX = x % 3
    const subY = y % 3
    
    // Only allow placement on edge and center positions, not corners
    // Pattern: X E X
    //          E N E
    //          X E X
    return !((subX === 0 || subX === 2) && (subY === 0 || subY === 2))
  }


  // Get more accessible placement type with expanded center area
  const getAccessiblePlacementType = (tilePos: MapPosition): 'edge' | 'normal' | 'invalid' => {
    const subX = tilePos.x % 3
    const subY = tilePos.y % 3
    
    // Corner positions are always invalid
    if ((subX === 0 || subX === 2) && (subY === 0 || subY === 2)) {
      return 'invalid'
    }
    
    const isDoorTile = selectedTile?.id.toLowerCase().includes('door') && 
                       !selectedTile?.id.toLowerCase().includes('gate_switch')
    
    // Center position (1,1) is always normal
    if (subX === 1 && subY === 1) {
      return 'normal'
    }
    
    // Edge positions: top, right, bottom, left
    const isEdgePosition = (subX === 1 && (subY === 0 || subY === 2)) || 
                          (subY === 1 && (subX === 0 || subX === 2))
    
    if (isEdgePosition) {
      // If user has door selected, these are edge positions
      if (isDoorTile) {
        return 'edge'
      }
      // If user has normal tile selected or in path mode, these remain edge
      // (normal tiles cannot be placed on edges)
      return 'edge'
    }
    
    // This shouldn't happen with the current 3x3 logic, but fallback
    return 'normal'
  }

  // Get expanded click area based on selected tile type
  const getExpandedPlacementType = (tilePos: MapPosition): 'edge' | 'normal' | 'invalid' => {
    const subX = tilePos.x % 3
    const subY = tilePos.y % 3
    console.log('getExpandedPlacementType called with tilePos:', tilePos, 'subX:', subX, 'subY:', subY)
    console.log('selectedTile:', selectedTile?.id)
    console.log('drawingMode:', drawingMode)
    
    const isDoorTile = selectedTile?.id.toLowerCase().includes('door') && 
                       !selectedTile?.id.toLowerCase().includes('gate_switch')
    const isEdgeTile = selectedTile ? tileLoader.isEdgeTile(selectedTile) : false
    console.log('isDoorTile:', isDoorTile, 'isEdgeTile:', isEdgeTile)
    
    // Corner positions are always invalid
    if ((subX === 0 || subX === 2) && (subY === 0 || subY === 2)) {
      console.log('Corner position detected - invalid')
      return 'invalid'
    }
    
    // If in path mode, allow clicking anywhere (corners, edges, center)
    if (drawingMode === 'path') {
      // For path mode, treat ALL positions as normal (including corners)
      // This allows clicking anywhere and it will place at center
      console.log('Path mode - allowing placement')
      return 'normal'
    }
    
    // If holding normal tile, allow clicking anywhere in the 3x3 grid cell
    if (selectedTile && !isEdgeTile) {
      // Normal tiles can be clicked anywhere in the 3x3 grid but always place at center
      // Allow clicking in ALL positions within the grid cell (including corners)
      console.log('Normal tile detected, allowing placement anywhere in grid')
      return 'normal'
    }
    
    // If holding edge tile, expand edge access zones
    if (isEdgeTile) {
      const isExactEdgePosition = (subX === 1 && (subY === 0 || subY === 2)) || 
                                 (subY === 1 && (subX === 0 || subX === 2))
      
      if (isExactEdgePosition) {
        // Exact edge position - definitely edge
        return 'edge'
      }
      
      // For edge tiles, make center position also accessible for edge placement
      // This gives edge tiles a larger click area
      if (subX === 1 && subY === 1) {
        // Center position when holding edge tile - treat as edge for easier access
        return 'edge'
      }
      
      // Otherwise invalid for doors
      return 'invalid'
    }
    
    // Use standard placement logic
    return getAccessiblePlacementType(tilePos)
  }
  
  // Check if a position is on a path (for path-only placement restriction)
  const isPositionOnPath = (tilePos: MapPosition): boolean => {
    // Convert tile position to logical grid coordinates (27x27)
    const logicalX = Math.floor(tilePos.x / 3)
    const logicalY = Math.floor(tilePos.y / 3)
    
    return paths.some(pathPoint => pathPoint.x === logicalX && pathPoint.y === logicalY)
  }

  // Get the actual target position (maps expanded clicks to correct positions)
  const getTargetPosition = (tilePos: MapPosition): MapPosition => {
    const subX = tilePos.x % 3
    const subY = tilePos.y % 3
    const blockX = Math.floor(tilePos.x / 3) * 3
    const blockY = Math.floor(tilePos.y / 3) * 3
    
    const isEdgeTile = selectedTile ? tileLoader.isEdgeTile(selectedTile) : false
    
    // For edge tiles, map clicks to edges
    if (isEdgeTile) {
      // Map center clicks to top edge (or could be made smarter)
      if (subX === 1 && subY === 1) {
        return { x: blockX + 1, y: blockY + 0 }
      }
      // Already on edge or close to edge
      return tilePos
    }
    
    // For normal tiles and paths, map all clicks to center
    if (selectedTile && !isEdgeTile) {
      // Normal tiles always go to center regardless of where clicked
      return { x: blockX + 1, y: blockY + 1 }
    }
    
    // For paths, also map to center
    if (drawingMode === 'path') {
      return { x: blockX + 1, y: blockY + 1 }
    }
    
    return tilePos
  }

  // Add path point (with drag operation tracking)
  const addPathPoint = (tilePos: MapPosition, isFirstClick: boolean = false) => {
    if (tilePos.x < 0 || tilePos.x >= mapData.width || tilePos.y < 0 || tilePos.y >= mapData.height) {
      return
    }

    // Only allow path on normal positions (center of 3x3 blocks)
    const placementType = getExpandedPlacementType(tilePos)
    if (placementType !== 'normal') {
      console.log('Paths can only be placed on normal (center) positions')
      return
    }

    // Convert to logical grid coordinates (27x27)
    const logicalX = Math.floor(tilePos.x / 3)
    const logicalY = Math.floor(tilePos.y / 3)
    const cellKey = `${logicalX},${logicalY}`

    // If this cell was already processed in this drag operation, skip
    if (!isFirstClick && processedCells.has(cellKey)) {
      return
    }

    // Add to processed cells
    setProcessedCells(prev => new Set(prev).add(cellKey))

    // Check if point already exists
    const existingIndex = paths.findIndex(p => p.x === logicalX && p.y === logicalY)
    if (existingIndex === -1) {
      // Only add if point doesn't exist (don't toggle/remove)
      onPathsChange([...paths, { x: logicalX, y: logicalY }])
    }
    // If point already exists, do nothing (left-click should only add, not remove)
  }

  // Place tile at position
  const placeTile = (tilePos: MapPosition) => {
    if (!selectedTile || tilePos.x < 0 || tilePos.x >= mapData.width || tilePos.y < 0 || tilePos.y >= mapData.height) {
      return
    }

    // Check if placement is restricted to paths only
    if (placeOnPathOnly && !isPositionOnPath(tilePos)) {
      console.log('Tile placement restricted to path areas only')
      return
    }

    // Get the target position (maps expanded door clicks to exact edges)
    const targetPos = getTargetPosition(tilePos)
    
    // Check if placement is valid
    if (!isValidPlacement(targetPos.x, targetPos.y)) {
      console.log('Invalid placement position - corner/cross area', targetPos)
      return
    }

    const placementType = getExpandedPlacementType(tilePos)
    const isEdgeTile = tileLoader.isEdgeTile(selectedTile)

    // Validate tile type matches placement position
    if (placementType === 'edge' && !isEdgeTile) {
      console.log('Only edge tiles (doors/switches) can be placed on edge positions')
      return
    }
    if (placementType === 'normal' && isEdgeTile) {
      console.log('Edge tiles can only be placed on edge positions')  
      return
    }

    const newMapData = { ...mapData }
    const currentLayer = newMapData.layers[0] // For now, just use the first layer
    currentLayer.tiles[targetPos.y][targetPos.x] = selectedTile.id

    onMapDataChange(newMapData)
  }


  // Check if a path point has a neighbor path in a specific direction
  const hasPathConnection = (pathPoint: {x: number, y: number}, direction: 'top' | 'right' | 'bottom' | 'left'): boolean => {
    const directions = {
      top: { x: 0, y: -1 },
      right: { x: 1, y: 0 },
      bottom: { x: 0, y: 1 },
      left: { x: -1, y: 0 }
    }
    
    const delta = directions[direction]
    const neighborX = pathPoint.x + delta.x
    const neighborY = pathPoint.y + delta.y
    
    // Simply check if there's a path at the neighbor position
    // Connected paths should have no walls regardless of doors
    return paths.some(p => p.x === neighborX && p.y === neighborY)
  }


  // Draw path background only (without walls or corner cutouts)
  const drawPaths = (ctx: CanvasRenderingContext2D) => {
    const cellSize = 120 // Logical grid cell size

    paths.forEach((pathPoint) => {
      const cellX = pathPoint.x * cellSize
      const cellY = pathPoint.y * cellSize

      // Draw simple black path background filling the entire grid cell
      ctx.fillStyle = '#000000'  // Black path background
      ctx.fillRect(cellX, cellY, cellSize, cellSize)
    })
  }

  // Draw walls on the edges of path cells
  const drawPathWalls = (ctx: CanvasRenderingContext2D) => {
    const cellSize = 120 // Logical grid cell size
    const wallWidth = 12 // Wall thickness (reduced from 16 to 12)

    ctx.fillStyle = '#f6ede0' // Wall color

    paths.forEach((pathPoint) => {
      const cellX = pathPoint.x * cellSize
      const cellY = pathPoint.y * cellSize

      // Get connection info for all directions
      const hasTop = hasPathConnection(pathPoint, 'top')
      const hasRight = hasPathConnection(pathPoint, 'right')
      const hasBottom = hasPathConnection(pathPoint, 'bottom')
      const hasLeft = hasPathConnection(pathPoint, 'left')

      // Draw walls as filled rectangles on cell edges
      // Top wall - positioned at top edge
      if (!hasTop) {
        ctx.fillRect(
          cellX, 
          cellY, 
          cellSize, 
          wallWidth
        )
      }
      
      // Right wall - positioned at right edge
      if (!hasRight) {
        ctx.fillRect(
          cellX + cellSize - wallWidth, 
          cellY, 
          wallWidth, 
          cellSize
        )
      }
      
      // Bottom wall - positioned at bottom edge
      if (!hasBottom) {
        ctx.fillRect(
          cellX, 
          cellY + cellSize - wallWidth, 
          cellSize, 
          wallWidth
        )
      }
      
      // Left wall - positioned at left edge
      if (!hasLeft) {
        ctx.fillRect(
          cellX, 
          cellY, 
          wallWidth, 
          cellSize
        )
      }
    })
  }

  // Helper function to calculate perpendicular offset for a line segment
  const calculatePerpendicularOffset = (point1: MapPosition, point2: MapPosition, offsetDistance: number): {x: number, y: number} => {
    const dx = point2.x - point1.x
    const dy = point2.y - point1.y
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) return { x: 0, y: 0 }
    
    // Perpendicular vector (rotate 90 degrees)
    const perpX = -dy / length
    const perpY = dx / length
    
    return {
      x: perpX * offsetDistance,
      y: perpY * offsetDistance
    }
  }

  // Calculate offset positions for overlapping arrows
  const calculateArrowOffsets = (arrows: CommentArrow[]): Map<string, {x: number, y: number}[]> => {
    const offsetMap = new Map<string, {x: number, y: number}[]>()
    const offsetDistance = 12 // pixels between parallel arrows
    
    arrows.forEach((arrow, arrowIndex) => {
      const offsetPoints: {x: number, y: number}[] = []
      
      for (let i = 0; i < arrow.points.length; i++) {
        const currentPoint = arrow.points[i]
        
        // Find overlapping arrows at this point
        const overlappingArrows = arrows.filter((otherArrow, otherIndex) => {
          if (otherIndex >= arrowIndex) return false // Only consider previous arrows
          
          return otherArrow.points.some(otherPoint => 
            Math.abs(otherPoint.x - currentPoint.x) <= 1 && 
            Math.abs(otherPoint.y - currentPoint.y) <= 1
          )
        })
        
        let offset = { x: 0, y: 0 }
        
        if (overlappingArrows.length > 0 && i > 0) {
          // Calculate offset based on line direction
          const prevPoint = arrow.points[i - 1]
          const perpOffset = calculatePerpendicularOffset(prevPoint, currentPoint, offsetDistance)
          
          // Offset this arrow to the side (alternate sides based on arrow index)
          const side = (arrowIndex % 2 === 0) ? 1 : -1
          offset = {
            x: perpOffset.x * side * (Math.floor(arrowIndex / 2) + 1),
            y: perpOffset.y * side * (Math.floor(arrowIndex / 2) + 1)
          }
        }
        
        offsetPoints.push(offset)
      }
      
      offsetMap.set(arrow.id, offsetPoints)
    })
    
    return offsetMap
  }

  // Draw comment arrows
  const drawArrows = (ctx: CanvasRenderingContext2D) => {
    const commentLayer = mapData.layers.find(layer => layer.type === 'comments')
    if (appMode !== 'comment' || !commentLayer || !commentLayer.visible || !commentLayer.arrows) return

    // Apply comment layer opacity
    ctx.globalAlpha = commentLayer.opacity

    // Calculate offsets for all arrows
    const arrowOffsets = calculateArrowOffsets(commentLayer.arrows)

    // Helper function to draw arrow segments and arrowhead with offset
    const drawArrowPath = (arrow: CommentArrow, points: MapPosition[], color: string, thickness: number, isPreview = false) => {
      if (points.length < 2) return

      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = thickness
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Get offsets for this arrow
      const offsets = isPreview ? [] : (arrowOffsets.get(arrow.id) || [])

      // Draw all line segments with offsets
      ctx.beginPath()
      const firstPoint = points[0]
      const firstOffset = offsets[0] || { x: 0, y: 0 }
      const startX = firstPoint.x * mapData.tileSize + mapData.tileSize / 2 + firstOffset.x
      const startY = firstPoint.y * mapData.tileSize + mapData.tileSize / 2 + firstOffset.y
      ctx.moveTo(startX, startY)

      for (let i = 1; i < points.length; i++) {
        const point = points[i]
        const offset = offsets[i] || { x: 0, y: 0 }
        const endX = point.x * mapData.tileSize + mapData.tileSize / 2 + offset.x
        const endY = point.y * mapData.tileSize + mapData.tileSize / 2 + offset.y
        ctx.lineTo(endX, endY)
      }
      ctx.stroke()

      // Draw larger arrowhead at the end (with offset)
      const lastPoint = points[points.length - 1]
      const secondLastPoint = points[points.length - 2]
      const lastOffset = offsets[points.length - 1] || { x: 0, y: 0 }
      const secondLastOffset = offsets[points.length - 2] || { x: 0, y: 0 }
      
      const endX = lastPoint.x * mapData.tileSize + mapData.tileSize / 2 + lastOffset.x
      const endY = lastPoint.y * mapData.tileSize + mapData.tileSize / 2 + lastOffset.y
      const prevX = secondLastPoint.x * mapData.tileSize + mapData.tileSize / 2 + secondLastOffset.x
      const prevY = secondLastPoint.y * mapData.tileSize + mapData.tileSize / 2 + secondLastOffset.y

      const angle = Math.atan2(endY - prevY, endX - prevX)
      const arrowLength = 48 // Doubled from 24 to 48
      const arrowAngle = Math.PI / 4 // Even wider angle for massive arrowhead

      // Draw and fill arrowhead
      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle - arrowAngle),
        endY - arrowLength * Math.sin(angle - arrowAngle)
      )
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle + arrowAngle),
        endY - arrowLength * Math.sin(angle + arrowAngle)
      )
      ctx.closePath()
      ctx.fill()

      // Add small circles at breakpoints for visibility (except start and end)
      if (!isPreview && points.length > 2) {
        ctx.fillStyle = color
        for (let i = 1; i < points.length - 1; i++) {
          const point = points[i]
          const offset = offsets[i] || { x: 0, y: 0 }
          const x = point.x * mapData.tileSize + mapData.tileSize / 2 + offset.x
          const y = point.y * mapData.tileSize + mapData.tileSize / 2 + offset.y
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // Draw existing arrows
    commentLayer.arrows.forEach(arrow => {
      drawArrowPath(arrow, arrow.points, arrow.color, arrow.thickness)
    })

    // Draw preview arrow while drawing (no offset for preview)
    if (isDrawingArrow && currentArrowPoints.length > 0 && mousePosition) {
      // Convert current arrow points to centered positions
      const previewPoints = currentArrowPoints.map(point => getTileCenterPosition(point))
      
      // Add current mouse position as preview endpoint (properly converted)
      const mouseTilePos = {
        x: Math.floor(mousePosition.x / mapData.tileSize),
        y: Math.floor(mousePosition.y / mapData.tileSize)
      }
      const mouseCenter = getTileCenterPosition(mouseTilePos)
      
      previewPoints.push(mouseCenter)

      // Determine if the current segment is valid
      const isValidSegment = isValidArrowSegment(mouseTilePos)
      const previewColor = isValidSegment ? selectedArrowColor : '#ff4444' // Red for invalid

      // Create temporary arrow object for preview
      const previewArrow: CommentArrow = {
        id: 'preview',
        points: previewPoints,
        color: previewColor,
        thickness: 10,
        timestamp: Date.now()
      }

      ctx.globalAlpha = 0.7
      drawArrowPath(previewArrow, previewPoints, previewColor, 10, true) // No offset for preview
      ctx.globalAlpha = commentLayer.opacity

      // Add visual indicator for invalid placement
      if (!isValidSegment && currentArrowPoints.length > 0) {
        ctx.strokeStyle = '#ff4444'
        ctx.lineWidth = 6 // Doubled from 3 to 6
        ctx.setLineDash([12, 12]) // Larger dashes for much thicker line
        
        const lastPoint = getTileCenterPosition(currentArrowPoints[currentArrowPoints.length - 1])
        const lastX = lastPoint.x * mapData.tileSize + mapData.tileSize / 2
        const lastY = lastPoint.y * mapData.tileSize + mapData.tileSize / 2
        const mouseX = mouseCenter.x * mapData.tileSize + mapData.tileSize / 2
        const mouseY = mouseCenter.y * mapData.tileSize + mapData.tileSize / 2
        
        ctx.beginPath()
        ctx.moveTo(lastX, lastY)
        ctx.lineTo(mouseX, mouseY)
        ctx.stroke()
        
        ctx.setLineDash([]) // Reset to solid line
      }
    }

    // Reset alpha after drawing arrows
    ctx.globalAlpha = 1.0
  }

  // Render the canvas
  const renderCanvas = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    
    // Clear canvas with darker background
    ctx.fillStyle = 'rgb(153, 153, 153)'  // Darker gray background
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Apply scale transform to fit within 1080px limit
    ctx.save()
    ctx.scale(scaleFactor, scaleFactor)

    // 0. Draw paths first (lowest layer)
    drawPaths(ctx)

    // Load tiles if not already loaded
    const loadedTiles = await tileLoader.loadTiles()
    const tileMap = new Map(loadedTiles.map(tile => [tile.id, tile]))

    // 1. Draw user-placed tiles first (bottom layer)
    // Set transparency for tiles when in path mode
    if (drawingMode === 'path') {
      ctx.globalAlpha = 0.25 // 75% transparent (25% opacity)
    }
    
    mapData.layers.forEach(layer => {
      if (!layer.visible) return

      for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
          const tileId = layer.tiles[y][x]
          if (tileId) {
            const tile = tileMap.get(tileId)
            if (tile) {
              // Calculate position for this grid cell
              const cellX = x * mapData.tileSize
              const cellY = y * mapData.tileSize
              
              // Draw tile with maximum 38px size, centered in 40px grid cell
              tileLoader.drawTileWithMaxSize(ctx, tile, cellX, cellY)
            } else {
              // Fallback: draw a colored rectangle if tile not found
              ctx.fillStyle = '#9ca3af'
              ctx.fillRect(
                x * mapData.tileSize + 1,
                y * mapData.tileSize + 1,
                mapData.tileSize - 2,
                mapData.tileSize - 2
              )

              // Add tile ID as text
              ctx.fillStyle = '#000'
              ctx.font = '8px sans-serif'
              ctx.textAlign = 'center'
              ctx.fillText(
                tileId.substring(0, 4),
                x * mapData.tileSize + mapData.tileSize / 2,
                y * mapData.tileSize + mapData.tileSize / 2 + 2
              )
            }
          }
        }
      }
    })

    // Reset transparency after drawing tiles
    ctx.globalAlpha = 1.0

    // 2. Draw Frame2.png grid with 50% transparency - only on 27x27 core cells
    if (frameImage && showGrid) {
      // Set transparency for the grid (50% more transparent than before)
      ctx.globalAlpha = 0.25
      
      // Frame should only render on every 3rd cell (27x27 core grid from 81x81)
      for (let y = 0; y < 27; y++) {
        for (let x = 0; x < 27; x++) {
          // Calculate position: multiply by 3 to get the core cell positions
          const cellX = (x * 3) * mapData.tileSize
          const cellY = (y * 3) * mapData.tileSize
          
          // Draw frame at 3x3 tile size (120x120px) to cover the full core cell
          ctx.drawImage(
            frameImage,
            cellX, cellY,
            mapData.tileSize * 3, mapData.tileSize * 3
          )
        }
      }
      
      // Reset transparency for future draws
      ctx.globalAlpha = 1.0
    }

    // 3. Draw path walls on top of grid
    drawPathWalls(ctx)

    // 4. Draw comment arrows (if in comment mode)
    drawArrows(ctx)

    // Restore canvas context before drawing mouse preview
    ctx.restore()

    // 5. Draw mouse cursor preview (top layer) - outside scaled context
    drawMousePreview(ctx)
  }

  // Draw mouse cursor tile preview
  const drawMousePreview = (ctx: CanvasRenderingContext2D) => {
    if (!mousePosition || !selectedTile || drawingMode === 'path') return

    const previewSize = 60 // Larger preview for better visibility with scaled canvas

    // Draw semi-transparent preview tile at mouse position
    ctx.globalAlpha = 0.7
    ctx.save()
    
    // Translate to scaled mouse position (since we're now in unscaled context)
    ctx.translate(mousePosition.x * scaleFactor, mousePosition.y * scaleFactor)
    
    // Apply rotation
    ctx.rotate((tileRotation * Math.PI) / 180)
    
    // Draw preview tile centered on cursor
    if (tileLoader.getTileImage()) {
      try {
        const originalWidth = selectedTile.textureRect.width
        const originalHeight = selectedTile.textureRect.height
        
        // Calculate scale to fit preview size
        const scaleX = previewSize / originalWidth
        const scaleY = previewSize / originalHeight
        const scale = Math.min(scaleX, scaleY, 1)
        
        const drawWidth = originalWidth * scale
        const drawHeight = originalHeight * scale
        
        ctx.drawImage(
          tileLoader.getTileImage()!,
          selectedTile.textureRect.x, selectedTile.textureRect.y,
          originalWidth, originalHeight,
          -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
        )
      } catch (error) {
        console.error('Error drawing preview tile:', error)
      }
    }
    
    ctx.restore()
    ctx.globalAlpha = 1.0
  }


  // Remove tile at position
  const removeTile = (tilePos: MapPosition) => {
    if (tilePos.x < 0 || tilePos.x >= mapData.width || tilePos.y < 0 || tilePos.y >= mapData.height) {
      return
    }

    const newMapData = { ...mapData }
    const currentLayer = newMapData.layers[0] // For now, just use the first layer
    currentLayer.tiles[tilePos.y][tilePos.x] = null

    onMapDataChange(newMapData)
  }

  // Remove path point at position
  const removePathPoint = (tilePos: MapPosition) => {
    if (tilePos.x < 0 || tilePos.x >= mapData.width || tilePos.y < 0 || tilePos.y >= mapData.height) {
      return
    }

    // Convert to logical grid coordinates (27x27)
    const logicalX = Math.floor(tilePos.x / 3)
    const logicalY = Math.floor(tilePos.y / 3)

    // Find and remove the path point if it exists
    const existingIndex = paths.findIndex(p => p.x === logicalX && p.y === logicalY)
    if (existingIndex !== -1) {
      const newPaths = paths.filter((_, i) => i !== existingIndex)
      onPathsChange(newPaths)
    }
  }

  // Get the center position of a tile for arrow placement
  const getTileCenterPosition = (tilePos: MapPosition): MapPosition => {
    // Return the actual position for edge positions (N) and center position (E)
    // This preserves the distinction between different positions in the 3x3 grid
    return { x: tilePos.x, y: tilePos.y }
  }

  // Check if position is valid for arrow placement (must be on path)
  const isValidArrowPosition = (tilePos: MapPosition): boolean => {
    const subX = tilePos.x % 3
    const subY = tilePos.y % 3
    
    // Allow all positions except corners (this includes N positions)
    // Pattern: X N X
    //          N E N  
    //          X N X
    // Where X = corners (invalid), N = normal/edge (valid), E = center (valid)
    const isCorner = (subX === 0 || subX === 2) && (subY === 0 || subY === 2)
    if (isCorner) return false
    
    // Convert to logical grid coordinates (27x27) to check if on path
    const logicalX = Math.floor(tilePos.x / 3)
    const logicalY = Math.floor(tilePos.y / 3)
    
    // Must be on a path
    return paths.some(pathPoint => pathPoint.x === logicalX && pathPoint.y === logicalY)
  }

  // Check if line segment between two points is straight (horizontal or vertical)
  const isStraightLine = (point1: MapPosition, point2: MapPosition): boolean => {
    const center1 = getTileCenterPosition(point1)
    const center2 = getTileCenterPosition(point2)
    
    // Line is straight if it's either perfectly horizontal or perfectly vertical
    const isHorizontal = center1.y === center2.y && Math.abs(center1.x - center2.x) > 0
    const isVertical = center1.x === center2.x && Math.abs(center1.y - center2.y) > 0
    
    return isHorizontal || isVertical
  }

  // Check if line segment passes through walls
  const doesLinePassThroughWalls = (point1: MapPosition, point2: MapPosition): boolean => {
    const center1 = getTileCenterPosition(point1)
    const center2 = getTileCenterPosition(point2)
    
    // If points are the same, no wall crossing
    if (center1.x === center2.x && center1.y === center2.y) return false
    
    // Check if line is straight first
    if (!isStraightLine(point1, point2)) return true // Diagonal lines always pass through walls
    
    // For now, let's simplify this and allow all straight lines
    // The complex wall detection was causing issues
    // We can re-enable more sophisticated wall detection later if needed
    return false
  }

  // Check if two points are adjacent and aligned
  const arePointsAdjacentAndAligned = (point1: MapPosition, point2: MapPosition): boolean => {
    const center1 = getTileCenterPosition(point1)
    const center2 = getTileCenterPosition(point2)
    
    const dx = Math.abs(center2.x - center1.x)
    const dy = Math.abs(center2.y - center1.y)
    
    // Allow any straight line distance, not just adjacent
    // This allows arrows to span multiple grid cells in straight lines
    const isHorizontal = (dy === 0 && dx > 0)
    const isVertical = (dx === 0 && dy > 0)
    
    console.log('Adjacency check:', { point1, point2, center1, center2, dx, dy, isHorizontal, isVertical })
    
    return isHorizontal || isVertical
  }

  // Validate if a new point can be added to the current arrow
  const isValidArrowSegment = (newPoint: MapPosition): boolean => {
    if (currentArrowPoints.length === 0) return isValidArrowPosition(newPoint) // First point must be on path
    
    const lastPoint = currentArrowPoints[currentArrowPoints.length - 1]
    
    // Both points must be on valid positions (paths)
    const newPointValid = isValidArrowPosition(newPoint)
    const isStraight = isStraightLine(lastPoint, newPoint)
    const isAdjacent = arePointsAdjacentAndAligned(lastPoint, newPoint)
    const passesWalls = doesLinePassThroughWalls(lastPoint, newPoint)
    
    // Debug logging
    console.log('Arrow validation:', {
      lastPoint,
      newPoint,
      newPointValid,
      isStraight,
      isAdjacent,
      passesWalls,
      valid: newPointValid && isStraight && isAdjacent && !passesWalls
    })
    
    // Check all conditions: on path, straight line, adjacent positioning, no walls
    return newPointValid && isStraight && isAdjacent && !passesWalls
  }

  // Create a new arrow from current points
  const createArrowFromPoints = (points: MapPosition[]) => {
    const commentLayer = mapData.layers.find(layer => layer.type === 'comments')
    if (!commentLayer || points.length < 2) return
    
    // Convert points to tile centers
    const centerPoints = points.map(point => getTileCenterPosition(point))
    
    const newArrow: CommentArrow = {
      id: `arrow-${Date.now()}-${Math.random()}`,
      points: centerPoints,
      color: selectedArrowColor,
      thickness: 10, // Doubled from 5 to 10
      timestamp: Date.now()
    }
    
    const updatedMapData = { ...mapData }
    const commentLayerIndex = updatedMapData.layers.findIndex(layer => layer.type === 'comments')
    if (commentLayerIndex >= 0) {
      updatedMapData.layers[commentLayerIndex] = {
        ...updatedMapData.layers[commentLayerIndex],
        arrows: [...(updatedMapData.layers[commentLayerIndex].arrows || []), newArrow]
      }
    }
    
    onMapDataChange(updatedMapData)
  }

  // Remove arrow at position
  const removeArrowAtPosition = (tilePos: MapPosition) => {
    const commentLayer = mapData.layers.find(layer => layer.type === 'comments')
    if (!commentLayer || !commentLayer.arrows) return
    
    const clickedCenter = getTileCenterPosition(tilePos)
    
    // Find arrows that have any point near this position
    const arrowsToRemove = commentLayer.arrows.filter(arrow => {
      return arrow.points.some(point => {
        const distance = Math.abs(point.x - clickedCenter.x) + Math.abs(point.y - clickedCenter.y)
        return distance <= 1 // Remove if click is within 1 tile of any point
      })
    })
    
    if (arrowsToRemove.length > 0) {
      const remainingArrows = commentLayer.arrows.filter(arrow => 
        !arrowsToRemove.some(toRemove => toRemove.id === arrow.id)
      )
      
      const updatedMapData = { ...mapData }
      const commentLayerIndex = updatedMapData.layers.findIndex(layer => layer.type === 'comments')
      if (commentLayerIndex >= 0) {
        updatedMapData.layers[commentLayerIndex] = {
          ...updatedMapData.layers[commentLayerIndex],
          arrows: remainingArrows
        }
      }
      
      onMapDataChange(updatedMapData)
    }
  }

  // Handle mouse events
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const tilePos = getMouseTilePosition(event)
    
    if (event.button === 0) {
      // Left click behavior depends on app mode
      if (appMode === 'comment') {
        // Comment mode: multi-segment arrow drawing
        if (isValidArrowPosition(tilePos)) {
          if (!isDrawingArrow) {
            // Start new arrow
            onDrawingArrowChange(true)
            onCurrentArrowPointsChange([{ x: tilePos.x, y: tilePos.y }])
          } else {
            // Add breakpoint to current arrow (only if valid segment)
            if (isValidArrowSegment(tilePos)) {
              const newPoints = [...currentArrowPoints, { x: tilePos.x, y: tilePos.y }]
              onCurrentArrowPointsChange(newPoints)
            }
            // If invalid, ignore the click (could add visual feedback here)
          }
        }
      } else {
        // Edit mode: normal tile/path drawing
        setIsDrawing(true)
        setProcessedCells(new Set()) // Clear processed cells for new drag operation
        
        // Left click always draws/places based on current mode
        if (drawingMode === 'path') {
          addPathPoint(tilePos, true) // Mark as first click
        } else {
          // Tile mode: only place if we have a selected tile
          if (selectedTile) {
            placeTile(tilePos)
          }
        }
      }
    } else if (event.button === 2) {
      // Right click - erasing (only start erasing, don't erase yet)
      event.preventDefault()
      
      if (appMode === 'comment') {
        if (isDrawingArrow && currentArrowPoints.length > 0) {
          // Finish drawing current arrow
          createArrowFromPoints(currentArrowPoints)
          onDrawingArrowChange(false)
          onCurrentArrowPointsChange([])
        } else {
          // Remove arrows at position
          removeArrowAtPosition(tilePos)
        }
      } else {
        // Edit mode: normal erasing
        setIsErasing(true)
        setProcessedCells(new Set()) // Clear processed cells for new erase operation
        
        // Perform the initial erase action
        if (drawingMode === 'tile') {
          removeTile(tilePos)
        } else {
          removePathPoint(tilePos)
        }
      }
    }
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Update mouse position for cursor preview
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      setMousePosition({
        x: (event.clientX - rect.left) / scaleFactor,  // Account for canvas scaling
        y: (event.clientY - rect.top) / scaleFactor    // Account for canvas scaling
      })
    }

    if (isDrawing) {
      const tilePos = getMouseTilePosition(event)
      
      if (drawingMode === 'path') {
        addPathPoint(tilePos, false) // Not first click
      } else {
        // Tile mode: only place if we have a selected tile
        if (selectedTile) {
          placeTile(tilePos)
        }
      }
    }
    
    if (isErasing) {
      const tilePos = getMouseTilePosition(event)
      
      if (drawingMode === 'tile') {
        removeTile(tilePos)
      } else {
        removePathPoint(tilePos)
      }
    }
  }

  const handleMouseUp = () => {
    // Edit mode: normal mouse up handling (Comment mode handles completion via right-click)
    setIsDrawing(false)
    setIsErasing(false)
    setProcessedCells(new Set()) // Clear processed cells when drag ends
  }

  const handleMouseEnter = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Show cursor preview when mouse enters canvas
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      setMousePosition({
        x: (event.clientX - rect.left) / scaleFactor,  // Account for canvas scaling
        y: (event.clientY - rect.top) / scaleFactor    // Account for canvas scaling
      })
    }
  }

  const handleMouseLeave = () => {
    // Hide cursor preview when mouse leaves canvas
    setMousePosition(null)
    setIsDrawing(false)
    setIsErasing(false)
    setProcessedCells(new Set())
  }

  const handleRightClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Prevent default context menu
    event.preventDefault()
    event.stopPropagation()
  }


  // Switch water tile to next/previous variant
  const switchWaterTileVariant = async (direction: 1 | -1) => {
    if (!selectedTile) return

    // Load tiles to get all water variants
    const loadedTiles = await tileLoader.loadTiles()
    const waterTiles = loadedTiles.filter(tile => tile.id.includes('water_current'))
    
    if (waterTiles.length === 0) return

    // Find current tile index
    const currentIndex = waterTiles.findIndex(tile => tile.id === selectedTile.id)
    if (currentIndex === -1) return

    // Calculate next index (wrapping around)
    const nextIndex = (currentIndex + direction + waterTiles.length) % waterTiles.length
    const nextTile = waterTiles[nextIndex]

    // Update selected tile through the parent component
    onTileSelect(nextTile)
  }

  // Add non-passive wheel event listener to prevent scrolling
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const wheelHandler = (event: WheelEvent) => {
      // Always prevent page scroll when scrolling over canvas
      event.preventDefault()
      event.stopPropagation()
      
      // Only rotate if tile selected and it's a door or water tile
      if (selectedTile) {
        const isDoorTile = selectedTile.id.toLowerCase().includes('door') && 
                           !selectedTile.id.toLowerCase().includes('gate_switch')
        const isWaterTile = selectedTile.id.toLowerCase().includes('water')
        
        if (isDoorTile) {
          // For all doors (door1, door2, door3, door4), rotate visually
          const delta = event.deltaY
          if (delta > 0) {
            setTileRotation(prev => (prev + 90) % 360)
          } else {
            setTileRotation(prev => (prev - 90 + 360) % 360)
          }
        } else if (isWaterTile) {
          // For water tiles, switch to different water tile variants
          switchWaterTileVariant(event.deltaY > 0 ? 1 : -1)
        }
      }
    }

    canvas.addEventListener('wheel', wheelHandler, { passive: false })

    return () => {
      canvas.removeEventListener('wheel', wheelHandler)
    }
  }, [selectedTile, tileRotation])

  // Render canvas when map data, paths, mouse position, or comment layer changes
  useEffect(() => {
    renderCanvas()
  }, [mapData, canvasWidth, canvasHeight, paths, mousePosition, selectedTile, tileRotation, appMode, isDrawingArrow, currentArrowPoints])

  return (
    <div className="overflow-auto">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="cursor-crosshair border border-border"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleRightClick}
      />
      
      <div className="mt-2 text-sm text-muted-foreground">
        Canvas size: {canvasWidth} × {canvasHeight}px | 
        Grid: {mapData.width} × {mapData.height} tiles |
        Tile size: {mapData.tileSize}px
      </div>
    </div>
  )
}

export default TileCanvas