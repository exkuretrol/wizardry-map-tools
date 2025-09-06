import { useEffect, useState, useRef } from 'react';
import type { Tile } from '@/types';
import { tileLoader } from '@/utils/tileLoader';

interface TilePaletteProps {
  selectedTile: Tile | null;
  onTileSelect: (tile: Tile) => void;
}

const TilePalette = ({ selectedTile, onTileSelect }: TilePaletteProps) => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement }>({});

  useEffect(() => {
    const loadTiles = async () => {
      setLoading(true);
      try {
        console.log('Starting to load tiles...');
        const loadedTiles = await tileLoader.loadTiles();
        console.log('Loaded tiles:', loadedTiles.length, 'tiles');
        console.log('First few tiles:', loadedTiles.slice(0, 3));
        setTiles(loadedTiles);
      } catch (error) {
        console.error('Error loading tiles:', error);
      }
      setLoading(false);
    };

    loadTiles();
  }, []);

  // Update canvas when tiles change
  useEffect(() => {
    if (tiles.length > 0) {
      console.log('Rendering tiles on canvas...');

      // Add a small delay to ensure the image is fully ready for drawing
      const renderTiles = () => {
        let renderedCount = 0;
        tiles.forEach(tile => {
          const canvas = canvasRefs.current[tile.id];
          if (canvas) {
            const ctx = canvas.getContext('2d')!;
            ctx.clearRect(0, 0, 40, 40);

            // Add a light background to see the tile boundary
            ctx.fillStyle = '#f8f8f8';
            ctx.fillRect(0, 0, 40, 40);

            // Draw tile centered in 40px canvas for palette
            tileLoader.drawTileForPalette(ctx, tile, 38);
            renderedCount++;
          }
        });
        console.log(`Rendered ${renderedCount} tiles on canvas`);
      };

      // Wait a bit to ensure image is ready
      setTimeout(renderTiles, 100);
    }
  }, [tiles]);

  const groupedTiles = tiles.reduce(
    (acc, tile) => {
      if (!acc[tile.category]) {
        acc[tile.category] = [];
      }
      acc[tile.category].push(tile);
      return acc;
    },
    {} as { [category: string]: Tile[] }
  );

  // Sort tiles within each category by name
  Object.keys(groupedTiles).forEach(category => {
    groupedTiles[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading tiles...</div>
      </div>
    );
  }

  if (tiles.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">
          No tiles loaded. Check console for errors.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full overflow-y-auto overflow-x-visible">
      <div className="text-xs text-muted-foreground mb-1">
        {tiles.length} tiles, {Object.keys(groupedTiles).length} categories
      </div>

      {Object.entries(groupedTiles).map(([category, categoryTiles]) => (
        <div key={category}>
          <h4 className="text-xs font-medium mb-1 capitalize px-2">
            {category}
          </h4>
          <div className="flex flex-wrap gap-1 tile-container-spacing">
            {categoryTiles.map(tile => (
              <div key={tile.id} className="relative group">
                <button
                  onClick={() => onTileSelect(tile)}
                  className={`
                    border rounded p-1 transition-colors relative
                    w-[38px] h-[38px] flex items-center justify-center flex-shrink-0
                    ${
                      selectedTile?.id === tile.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <canvas
                    ref={el => {
                      if (el) canvasRefs.current[tile.id] = el;
                    }}
                    width={40}
                    height={40}
                    style={{ width: '40px', height: '40px' }}
                    className="block"
                  />
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 tooltip-bg">
                  {tile.name.replace('map_', '').replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selectedTile && (
        <div className="mt-4 p-3 border border-border rounded">
          <h4 className="text-sm font-medium">Selected Tile</h4>
          <p className="text-xs text-muted-foreground">{selectedTile.name}</p>
          <p className="text-xs text-muted-foreground">ID: {selectedTile.id}</p>
        </div>
      )}
    </div>
  );
};

export default TilePalette;
