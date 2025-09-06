import type { Tile, TileAtlasData } from '@/types';

export class TileLoader {
  private static instance: TileLoader;
  private tilesImage: HTMLImageElement | null = null;
  private tilesData: TileAtlasData | null = null;
  private loadedTiles: Tile[] = [];

  private constructor() {}

  static getInstance(): TileLoader {
    if (!TileLoader.instance) {
      TileLoader.instance = new TileLoader();
    }
    return TileLoader.instance;
  }

  async loadTiles(): Promise<Tile[]> {
    if (this.loadedTiles.length > 0) {
      return this.loadedTiles;
    }

    try {
      // Load the metadata
      console.log('Fetching tiles_meta.json...');
      const metaResponse = await fetch('/tiles/tiles_meta.json');

      if (!metaResponse.ok) {
        throw new Error(
          `Failed to fetch tiles_meta.json: ${metaResponse.status}`
        );
      }

      this.tilesData = (await metaResponse.json()) as TileAtlasData;
      console.log(
        'Loaded metadata:',
        this.tilesData.tiles.length,
        'tiles found'
      );

      // Load the main texture atlas
      console.log('Loading tiles.png image...');
      await this.loadTileImage();
      console.log('Image loaded successfully');

      // Parse tiles from simplified data
      this.loadedTiles = this.parseTilesFromData();
      console.log('Parsed tiles:', this.loadedTiles.length, 'tiles ready');

      return this.loadedTiles;
    } catch (error) {
      console.error('Failed to load tiles:', error);
      return [];
    }
  }

  private loadTileImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tilesImage = new Image();
      this.tilesImage.onload = () => resolve();
      this.tilesImage.onerror = reject;
      this.tilesImage.src = '/tiles/tiles.png';
    });
  }

  private parseTilesFromData(): Tile[] {
    if (!this.tilesData || !this.tilesImage) return [];

    const tiles: Tile[] = [];
    const imageHeight = this.tilesImage.height; // 512px

    this.tilesData.tiles.forEach(tileData => {
      // Categorize tiles based on name patterns
      const category = this.categorizeTile(tileData.name);

      // Apply Y-flipping: JSON uses bottom-left origin, Canvas uses top-left
      // Following Unity's formula: y = imageHeight - y - height
      const flippedY = imageHeight - tileData.y - tileData.height;

      tiles.push({
        id: tileData.name,
        name: this.formatTileName(tileData.name),
        image: '/tiles/tiles.png',
        category,
        textureRect: {
          x: tileData.x,
          y: flippedY,
          width: tileData.width,
          height: tileData.height,
        },
      });
    });

    return tiles;
  }

  private categorizeTile(spriteName: string): string {
    // switch_wall1,2,3 are passage tiles
    if (spriteName.includes('switch_wall')) return 'passages';
    // door2, door3, door4 are passage tiles
    if (
      spriteName.includes('door2') ||
      spriteName.includes('door3') ||
      spriteName.includes('door4')
    )
      return 'passages';
    // gates (excluding switch_iron_gate) stay in passages
    if (spriteName.includes('gate') && !spriteName.includes('switch_iron_gate'))
      return 'passages';
    // switches and buttons (excluding switch_wall which is handled above)
    if (spriteName.includes('switch') || spriteName.includes('button'))
      return 'switches';
    if (spriteName.includes('statue') || spriteName.includes('treasure'))
      return 'objects';
    // alarm floor moved to traps category
    if (spriteName.includes('alarm_floor')) return 'traps';
    // merged category: doors, pitfalls, floors, walls all together
    if (
      spriteName.includes('door') ||
      spriteName.includes('pitfall') ||
      spriteName.includes('floor') ||
      spriteName.includes('wall')
    )
      return 'connections';
    if (spriteName.includes('water') || spriteName.includes('current'))
      return 'water';
    if (spriteName.includes('enemy') || spriteName.includes('golem'))
      return 'enemies';
    if (spriteName.includes('trap')) return 'traps';
    if (spriteName === 'player_icon') return 'player';
    return 'misc';
  }

  // Check if a tile should be positioned on grid edges
  isEdgeTile(tile: Tile): boolean {
    const name = tile.id.toLowerCase();
    // switch_wall and door2,3,4 should be on edges
    return (
      name.includes('switch_wall') ||
      name.includes('door2') ||
      name.includes('door3') ||
      name.includes('door4')
    );
  }

  // Get placement type for a grid position
  getPlacementType(x: number, y: number): 'edge' | 'normal' | 'invalid' {
    const subX = Math.floor(x / 40) % 3;
    const subY = Math.floor(y / 40) % 3;

    // Corner positions are invalid
    if ((subX === 0 || subX === 2) && (subY === 0 || subY === 2)) {
      return 'invalid';
    }

    // Center position is normal
    if (subX === 1 && subY === 1) {
      return 'normal';
    }

    // All other positions are edges
    return 'edge';
  }

  private formatTileName(spriteName: string): string {
    return spriteName
      .replace('map_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Get the main texture atlas image for drawing
  getTileImage(): HTMLImageElement | null {
    return this.tilesImage;
  }

  // Draw tile for palette - simple centered scaling
  drawTileForPalette(
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    maxSize: number = 38
  ): void {
    if (!this.tilesImage) return;

    const originalWidth = tile.textureRect.width;
    const originalHeight = tile.textureRect.height;

    // Scale to fit within maxSize while maintaining aspect ratio
    const scale = Math.min(maxSize / originalWidth, maxSize / originalHeight);
    const drawWidth = originalWidth * scale;
    const drawHeight = originalHeight * scale;

    // Center in the 40x40 canvas
    const drawX = (40 - drawWidth) / 2;
    const drawY = (40 - drawHeight) / 2;

    // Draw the tile from atlas
    ctx.drawImage(
      this.tilesImage,
      tile.textureRect.x,
      tile.textureRect.y,
      originalWidth,
      originalHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );
  }

  // Extract a specific tile sprite to a canvas
  extractTileSprite(tile: Tile, size: number = 40): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = size;
    canvas.height = size;

    if (this.tilesImage) {
      // Draw the specific tile region from the atlas, scaled to fit the target size
      ctx.drawImage(
        this.tilesImage,
        tile.textureRect.x,
        tile.textureRect.y,
        tile.textureRect.width,
        tile.textureRect.height,
        0,
        0,
        size,
        size
      );
    }

    return canvas;
  }

  // Draw a tile with maximum 38px constraint and smart positioning
  drawTileWithMaxSize(
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    x: number,
    y: number
  ): void {
    if (this.tilesImage) {
      try {
        const originalWidth = tile.textureRect.width;
        const originalHeight = tile.textureRect.height;
        const placementType = this.getPlacementType(x, y);

        let drawWidth, drawHeight, scale;

        if (placementType === 'edge') {
          // For edge tiles (doors), handle rotation and scaling
          const gridX = Math.floor(x / 40);
          const gridY = Math.floor(y / 40);
          const subX = gridX % 3;
          const subY = gridY % 3;

          if (subX === 1 && (subY === 0 || subY === 2)) {
            // Top/Bottom edge (horizontal) - rotate 90°, use height as width span
            const scaleByHeight = 120 / originalHeight;
            drawWidth = originalHeight * scaleByHeight; // Rotated: height becomes width
            drawHeight = originalWidth * scaleByHeight; // Rotated: width becomes height
          } else if (subY === 1 && (subX === 0 || subX === 2)) {
            // Left/Right edge (vertical) - use original orientation
            const scaleByHeight = 120 / originalHeight;
            drawHeight = 120;
            drawWidth = originalWidth * scaleByHeight;
          } else {
            // Fallback - scale to fit within logical grid
            const scaleX = 114 / originalWidth; // 38 * 3 = 114
            const scaleY = 114 / originalHeight; // 38 * 3 = 114
            scale = Math.min(scaleX, scaleY, 3);
            drawWidth = originalWidth * scale;
            drawHeight = originalHeight * scale;
          }
        } else {
          // For normal tiles, scale to fit within logical grid cell
          const scaleX = 114 / originalWidth; // 38 * 3 = 114
          const scaleY = 114 / originalHeight; // 38 * 3 = 114
          scale = Math.min(scaleX, scaleY, 3);
          drawWidth = originalWidth * scale;
          drawHeight = originalHeight * scale;
        }

        let drawX, drawY;

        const gridX = Math.floor(x / 40);
        const gridY = Math.floor(y / 40);
        const subX = gridX % 3;
        const subY = gridY % 3;

        if (placementType === 'edge') {
          // Position edge tiles centered on logical grid edges (120px grid)
          const logicalGridX = Math.floor(gridX / 3) * 3; // Start of 3x3 block
          const logicalGridY = Math.floor(gridY / 3) * 3; // Start of 3x3 block
          const logicalCellX = logicalGridX * 40; // Pixel position of logical grid
          const logicalCellY = logicalGridY * 40; // Pixel position of logical grid

          if (subX === 1 && subY === 0) {
            // Top edge
            drawX = logicalCellX + (120 - drawWidth) / 2; // Center horizontally in 120px
            drawY = logicalCellY - drawHeight / 2; // Center on top edge line
          } else if (subX === 2 && subY === 1) {
            // Right edge
            drawX = logicalCellX + 120 - drawWidth / 2; // Center on right edge line
            drawY = logicalCellY + (120 - drawHeight) / 2; // Center vertically in 120px
          } else if (subX === 1 && subY === 2) {
            // Bottom edge
            drawX = logicalCellX + (120 - drawWidth) / 2; // Center horizontally in 120px
            drawY = logicalCellY + 120 - drawHeight / 2; // Center on bottom edge line
          } else if (subX === 0 && subY === 1) {
            // Left edge
            drawX = logicalCellX - drawWidth / 2; // Center on left edge line
            drawY = logicalCellY + (120 - drawHeight) / 2; // Center vertically in 120px
          } else {
            // Fallback to center in logical grid
            drawX = logicalCellX + (120 - drawWidth) / 2;
            drawY = logicalCellY + (120 - drawHeight) / 2;
          }
        } else {
          // For normal tiles, center in the individual 40px grid cell
          const cellX = gridX * 40;
          const cellY = gridY * 40;

          drawX = cellX + (40 - drawWidth) / 2;
          drawY = cellY + (40 - drawHeight) / 2;
        }

        // Check if we need to rotate for horizontal doors
        const needsRotation =
          placementType === 'edge' && subX === 1 && (subY === 0 || subY === 2);

        if (needsRotation) {
          // Save context and rotate for horizontal doors
          ctx.save();
          ctx.translate(drawX + drawWidth / 2, drawY + drawHeight / 2);
          ctx.rotate(Math.PI / 2); // 90 degrees
          ctx.drawImage(
            this.tilesImage,
            tile.textureRect.x,
            tile.textureRect.y,
            originalWidth,
            originalHeight,
            -drawHeight / 2,
            -drawWidth / 2,
            drawHeight,
            drawWidth
          );
          ctx.restore();
        } else {
          // Normal drawing without rotation
          ctx.drawImage(
            this.tilesImage,
            tile.textureRect.x,
            tile.textureRect.y,
            originalWidth,
            originalHeight,
            drawX,
            drawY,
            drawWidth,
            drawHeight
          );
        }
      } catch (error) {
        console.error(`Error drawing tile ${tile.id} with max size:`, error);
      }
    }
  }

  // Draw a tile at original size (no scaling) - kept for compatibility
  drawTileAtOriginalSize(
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    x: number,
    y: number
  ): void {
    if (this.tilesImage) {
      try {
        ctx.drawImage(
          this.tilesImage,
          tile.textureRect.x,
          tile.textureRect.y,
          tile.textureRect.width,
          tile.textureRect.height,
          x,
          y,
          tile.textureRect.width,
          tile.textureRect.height
        );
      } catch (error) {
        console.error(`Error drawing tile ${tile.id} at original size:`, error);
      }
    }
  }

  // Draw a tile directly to a canvas context at a specific position with scaling
  drawTile(
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    x: number,
    y: number,
    size: number = 40
  ): void {
    if (this.tilesImage) {
      try {
        ctx.drawImage(
          this.tilesImage,
          tile.textureRect.x,
          tile.textureRect.y,
          tile.textureRect.width,
          tile.textureRect.height,
          x,
          y,
          size,
          size
        );
      } catch (error) {
        console.error(`Error drawing tile ${tile.id}:`, error);
        // Draw a fallback rectangle
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px sans-serif';
        ctx.fillText('ERR', x + 2, y + 12);
      }
    } else {
      console.warn('TilesImage not loaded yet for tile:', tile.id);
    }
  }
}

// Export singleton instance
export const tileLoader = TileLoader.getInstance();
