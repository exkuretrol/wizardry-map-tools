import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import TileCanvas from './TileCanvas';
import TilePalette from './TilePalette';
import type { Tile, MapData } from '@/types';
import { tileLoader } from '@/utils/tileLoader';

const MapEditor = () => {
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [drawingMode, setDrawingMode] = useState<'tile' | 'path'>('tile');
  const [paths, setPaths] = useState<Array<{ x: number; y: number }>>([]);
  const [placeOnPathOnly, setPlaceOnPathOnly] = useState(true);
  const [globalMousePos, setGlobalMousePos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [savedMaps, setSavedMaps] = useState<any[]>([]);
  const [appMode, setAppMode] = useState<'edit' | 'comment'>('edit'); // Overall app mode
  const [activeTab, setActiveTab] = useState<'edit' | 'comment'>('edit'); // Active sidebar tab
  const [mapData, setMapData] = useState<MapData>({
    id: '100001', // Use integer as string for consistency
    name: 'New Map',
    width: 81,
    height: 81,
    tileSize: 40,
    mapId: '100001', // Add mapId field
    layers: [
      {
        id: 'layer-1',
        name: 'Background',
        tiles: Array(81)
          .fill(null)
          .map(() => Array(81).fill(null)),
        visible: true,
        opacity: 1,
        type: 'tiles',
      },
      {
        id: 'comment-layer-1',
        name: 'Comments',
        tiles: Array(81)
          .fill(null)
          .map(() => Array(81).fill(null)), // Empty tiles for comment layer
        visible: true,
        opacity: 1,
        type: 'comments',
        arrows: [],
      },
    ],
  });
  const [saveTitle, setSaveTitle] = useState(mapData.name);
  const [saveMapId, setSaveMapId] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showGrid, setShowGrid] = useState(true); // Grid visibility toggle
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [currentArrowPoints, setCurrentArrowPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [selectedArrowColor, setSelectedArrowColor] = useState('#ff0000'); // Default red arrows

  const handleTileSelect = (tile: Tile) => {
    setSelectedTile(tile);
    setHasUnsavedChanges(true); // Mark as having unsaved changes
    // Auto-switch to tile mode when selecting a tile from palette
    if (drawingMode !== 'tile') {
      setDrawingMode('tile');
    }
  };

  // Handle tab switching
  const handleTabSwitch = (tab: 'edit' | 'comment') => {
    setActiveTab(tab);
    setAppMode(tab);

    if (tab === 'comment') {
      // Clear selected tile when switching to comment mode
      setSelectedTile(null);
    }
  };

  // Show save dialog
  const handleSaveMap = () => {
    setSaveTitle(mapData.name);
    setSaveMapId(''); // Reset map ID field
    const maps = JSON.parse(localStorage.getItem('wizardry-maps') || '[]');
    setSavedMaps(maps);
    setShowSaveDialog(true);
  };

  // Generate random map ID
  const generateMapId = () => {
    return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
  };

  // Auto-save function
  const autoSave = () => {
    if (!hasUnsavedChanges || !mapData.name || mapData.name === 'New Map') {
      return; // Don't auto-save if no changes or it's a new unsaved map
    }

    const autoSaveData = {
      ...mapData,
      paths: paths,
      metadata: {
        savedAt: new Date().toISOString(),
        version: '1.0',
        autoSave: true,
      },
    };

    // Save to localStorage with special auto-save key
    localStorage.setItem('wizardry-map-autosave', JSON.stringify(autoSaveData));
    setLastSaved(new Date());
    console.log('Auto-saved at', new Date().toLocaleTimeString());
  };

  // Check for auto-save recovery on mount
  useEffect(() => {
    const autoSaveData = localStorage.getItem('wizardry-map-autosave');
    if (autoSaveData) {
      const parsedData = JSON.parse(autoSaveData);
      const autoSaveDate = new Date(parsedData.metadata.savedAt);
      const now = new Date();
      const timeDiff = now.getTime() - autoSaveDate.getTime();

      // If auto-save is less than 1 hour old, offer to recover
      if (
        timeDiff < 3600000 &&
        confirm(
          `An auto-saved version of "${parsedData.name}" was found from ${autoSaveDate.toLocaleString()}. Would you like to recover it?`
        )
      ) {
        // Ensure the map has a comment layer
        const layers = [...parsedData.layers];

        // Check if there's already a comment layer
        const existingCommentLayer = layers.find(
          layer => layer.type === 'comments'
        );
        if (!existingCommentLayer) {
          // Add comment layer if it doesn't exist
          layers.push({
            id: 'comment-layer-1',
            name: 'Comments',
            tiles: Array(parsedData.width || 81)
              .fill(null)
              .map(() => Array(parsedData.height || 81).fill(null)),
            visible: true,
            opacity: 1,
            type: 'comments',
            arrows: [],
          });
        }

        // Handle legacy commentLayer field
        if (parsedData.commentLayer && !existingCommentLayer) {
          const commentLayerIndex = layers.findIndex(
            layer => layer.type === 'comments'
          );
          if (commentLayerIndex >= 0) {
            layers[commentLayerIndex] = {
              ...layers[commentLayerIndex],
              arrows: parsedData.commentLayer.arrows || [],
            };
          }
        }

        setMapData({
          id: parsedData.id || parsedData.mapId,
          name: parsedData.name,
          width: parsedData.width,
          height: parsedData.height,
          tileSize: parsedData.tileSize || 40,
          layers: layers,
          mapId: parsedData.mapId || parsedData.id,
        });
        if (parsedData.paths) {
          setPaths(parsedData.paths);
        }
        setHasUnsavedChanges(true); // Mark as having unsaved changes since it's recovered
        setLastSaved(autoSaveDate);
        alert('Auto-save recovered successfully!');
      }
    }
  }, []); // Only run on mount

  // Save to localStorage with new title
  const handleConfirmSave = () => {
    let finalMapId;
    const userInputId = saveMapId.trim();

    if (userInputId) {
      // If user provided an ID, validate it's a number in correct range
      const numId = parseInt(userInputId);
      if (!isNaN(numId) && numId >= 100000 && numId <= 999999) {
        finalMapId = numId.toString();
      } else {
        alert(
          'Map ID must be a number between 100000 and 999999. Auto-generating instead.'
        );
        finalMapId = generateMapId().toString();
      }
    } else {
      // Auto-generate if no user input
      finalMapId = generateMapId().toString();
    }

    const updatedMapData = {
      ...mapData,
      name: saveTitle,
      id: finalMapId, // Use the integer mapId as the primary id
      mapId: finalMapId,
    };

    const mapToSave = {
      ...updatedMapData,
      id: finalMapId, // Explicitly ensure id is included
      mapId: finalMapId, // Explicitly ensure mapId is included
      paths: paths,
      metadata: {
        savedAt: new Date().toISOString(),
        version: '1.0',
      },
    };

    // Save to localStorage using mapId as key
    const savedMaps = JSON.parse(localStorage.getItem('wizardry-maps') || '[]');
    const existingIndex = savedMaps.findIndex(
      (map: any) => map.mapId === finalMapId
    );

    if (existingIndex >= 0) {
      savedMaps[existingIndex] = mapToSave;
    } else {
      savedMaps.push(mapToSave);
    }

    localStorage.setItem('wizardry-maps', JSON.stringify(savedMaps));

    // Update current map data with new title
    setMapData(updatedMapData);
    setShowSaveDialog(false);
    setHasUnsavedChanges(false); // Clear unsaved changes flag
    setLastSaved(new Date());

    // Show confirmation (you could add a toast notification here later)
    alert(`Map "${saveTitle}" saved successfully!`);
  };

  // Handle deleting a map
  const handleDeleteMap = (mapToDelete: any) => {
    if (!confirm(`Are you sure you want to delete "${mapToDelete.name}"?`)) {
      return;
    }

    const savedMaps = JSON.parse(localStorage.getItem('wizardry-maps') || '[]');
    const filteredMaps = savedMaps.filter(
      (map: any) => map.mapId !== mapToDelete.mapId
    );
    localStorage.setItem('wizardry-maps', JSON.stringify(filteredMaps));

    // Update the saved maps list in both dialogs
    setSavedMaps(filteredMaps);

    alert(`Map "${mapToDelete.name}" deleted successfully!`);
  };

  // Handle overwriting existing map
  const handleOverwriteMap = (existingMap: any) => {
    const mapToSave = {
      ...mapData,
      name: existingMap.name,
      id: existingMap.mapId, // Use mapId as the primary id
      mapId: existingMap.mapId, // Explicitly ensure mapId is included
      paths: paths,
      metadata: {
        savedAt: new Date().toISOString(),
        version: '1.0',
      },
    };

    // Save to localStorage
    const savedMaps = JSON.parse(localStorage.getItem('wizardry-maps') || '[]');
    const existingIndex = savedMaps.findIndex(
      (map: any) => map.mapId === existingMap.mapId
    );

    if (existingIndex >= 0) {
      savedMaps[existingIndex] = mapToSave;
      localStorage.setItem('wizardry-maps', JSON.stringify(savedMaps));

      // Update current map data
      setMapData({
        ...mapData,
        name: existingMap.name,
        mapId: existingMap.mapId,
        id: existingMap.mapId, // Use mapId as the primary id
      });
      setShowSaveDialog(false);
      setHasUnsavedChanges(false); // Clear unsaved changes flag
      setLastSaved(new Date());

      alert(`Map "${existingMap.name}" overwritten successfully!`);
    }
  };

  // Load map from localStorage
  const handleLoadMap = (map: any) => {
    // Ensure the map has a comment layer
    const layers = [...map.layers];

    // Check if there's already a comment layer
    const existingCommentLayer = layers.find(
      layer => layer.type === 'comments'
    );
    if (!existingCommentLayer) {
      // Add comment layer if it doesn't exist
      layers.push({
        id: 'comment-layer-1',
        name: 'Comments',
        tiles: Array(map.width || 81)
          .fill(null)
          .map(() => Array(map.height || 81).fill(null)),
        visible: true,
        opacity: 1,
        type: 'comments',
        arrows: [],
      });
    }

    // Handle legacy commentLayer field
    if (map.commentLayer && !existingCommentLayer) {
      const commentLayerIndex = layers.findIndex(
        layer => layer.type === 'comments'
      );
      if (commentLayerIndex >= 0) {
        layers[commentLayerIndex] = {
          ...layers[commentLayerIndex],
          arrows: map.commentLayer.arrows || [],
        };
      }
    }

    setMapData({
      id: map.mapId, // Use mapId as the primary id
      name: map.name,
      width: map.width,
      height: map.height,
      tileSize: map.tileSize || 40,
      layers: layers,
      mapId: map.mapId,
    });
    if (map.paths) {
      setPaths(map.paths);
    }

    // Auto-switch to comment mode when map is loaded
    setAppMode('comment');
    setActiveTab('comment');
    setSelectedTile(null); // Clear selected tile in comment mode

    setShowLoadDialog(false);
    setHasUnsavedChanges(false); // Reset unsaved changes flag when loading
    setLastSaved(new Date());
    alert(`Map "${map.name}" loaded successfully! Switched to Comment mode.`);
  };

  // Handle JSON file upload
  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);

        // Validate basic structure
        if (!jsonData.name || !jsonData.layers) {
          alert('Invalid map file format. Missing required fields.');
          return;
        }

        // Save to localStorage
        const savedMaps = JSON.parse(
          localStorage.getItem('wizardry-maps') || '[]'
        );
        const existingIndex = savedMaps.findIndex(
          (map: any) => map.id === jsonData.id
        );

        if (existingIndex >= 0) {
          savedMaps[existingIndex] = jsonData;
        } else {
          savedMaps.push(jsonData);
        }

        localStorage.setItem('wizardry-maps', JSON.stringify(savedMaps));

        // Refresh the saved maps list
        setSavedMaps(savedMaps);

        alert(`Map "${jsonData.name}" imported and saved to local storage!`);
      } catch (error) {
        alert('Error parsing JSON file. Please check the file format.');
        console.error('JSON parse error:', error);
      }
    };

    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  // Export to JSON file
  const handleExportMap = () => {
    const mapToSave = {
      ...mapData,
      paths: paths,
      metadata: {
        savedAt: new Date().toISOString(),
        version: '1.0',
      },
    };

    const dataStr = JSON.stringify(mapToSave, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${mapData.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Track global mouse position for cursor preview
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (selectedTile) {
        setGlobalMousePos({ x: event.clientX, y: event.clientY });
      }
    };

    const handleMouseLeave = () => {
      setGlobalMousePos(null);
    };

    if (selectedTile) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [selectedTile]);

  // Global right-click handler to reset selected tile
  useEffect(() => {
    const handleGlobalRightClick = (event: MouseEvent) => {
      // Check if right-click is outside canvas
      const target = event.target as HTMLElement;
      const isCanvas = target.tagName === 'CANVAS';

      if (!isCanvas && selectedTile) {
        event.preventDefault();
        setSelectedTile(null);
      }
    };

    document.addEventListener('contextmenu', handleGlobalRightClick);

    return () => {
      document.removeEventListener('contextmenu', handleGlobalRightClick);
    };
  }, [selectedTile]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      autoSave();
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges, mapData, paths]);

  // Track changes to map data and paths
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [mapData, paths]);

  // Add beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Modern browsers only need preventDefault() and returnValue
        event.preventDefault();
        event.returnValue = ''; // Empty string is the standard
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return (
    <div className="grid grid-cols-6 gap-4 h-full">
      {/* Left Sidebar - Tabs */}
      <Card className="col-span-1 h-full">
        <CardContent className="p-4 h-full flex flex-col">
          {/* Tab Headers */}
          <div className="flex mb-4 border-b border-border">
            <button
              onClick={() => handleTabSwitch('edit')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'edit'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => handleTabSwitch('comment')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'comment'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Comment
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'edit' && (
              <div className="h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4">Tile Palette</h3>
                <div className="flex-1 overflow-y-auto overflow-x-visible">
                  <TilePalette
                    selectedTile={selectedTile}
                    onTileSelect={handleTileSelect}
                  />
                </div>
              </div>
            )}

            {activeTab === 'comment' && (
              <div className="h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4">Comments</h3>

                {/* Arrow Controls */}
                <div className="mb-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showGrid"
                      checked={showGrid}
                      onChange={e => setShowGrid(e.target.checked)}
                      className="rounded"
                    />
                    <label
                      htmlFor="showGrid"
                      className="text-sm text-muted-foreground"
                    >
                      Show Grid
                    </label>
                  </div>

                  <div className="border-t border-border pt-3">
                    <h4 className="text-sm font-medium mb-2">Arrow Tools</h4>

                    <div className="space-y-2">
                      <div>
                        <label
                          htmlFor="arrowColor"
                          className="text-xs text-muted-foreground block mb-1"
                        >
                          Arrow Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id="arrowColor"
                            type="color"
                            value={selectedArrowColor}
                            onChange={e =>
                              setSelectedArrowColor(e.target.value)
                            }
                            className="w-8 h-8 rounded border border-border cursor-pointer"
                          />
                          <span className="text-xs text-muted-foreground">
                            {selectedArrowColor}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const updatedMapData = { ...mapData };
                          const commentLayer = updatedMapData.layers.find(
                            layer => layer.type === 'comments'
                          );
                          if (commentLayer && commentLayer.arrows) {
                            commentLayer.arrows = [];
                          }
                          setMapData(updatedMapData);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded hover:bg-destructive/90 transition-colors"
                        disabled={
                          !mapData.layers.find(
                            layer =>
                              layer.type === 'comments' &&
                              layer.arrows &&
                              layer.arrows.length > 0
                          )
                        }
                      >
                        Clear All Arrows (
                        {mapData.layers.find(layer => layer.type === 'comments')
                          ?.arrows?.length || 0}
                        )
                      </button>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="flex-1 overflow-y-auto">
                  <div className="text-xs text-muted-foreground space-y-2">
                    <div className="bg-secondary/30 p-2 rounded">
                      <p className="font-medium mb-1">How to draw arrows:</p>
                      <ul className="space-y-1">
                        <li>
                          • <strong>Left-click:</strong> Start arrow or add
                          breakpoint
                        </li>
                        <li>
                          • <strong>Right-click:</strong> Finish arrow or remove
                          existing
                        </li>
                        <li>
                          • <strong>Path only:</strong> Arrows must be placed on
                          paths (black areas)
                        </li>
                        <li>
                          • <strong>Straight lines only:</strong> Horizontal or
                          vertical segments
                        </li>
                        <li>
                          • <strong>Red preview:</strong> Shows invalid
                          placement
                        </li>
                      </ul>
                    </div>

                    {isDrawingArrow && (
                      <div className="bg-primary/10 p-2 rounded">
                        <p className="text-primary font-medium">
                          Drawing arrow... ({currentArrowPoints.length} points)
                        </p>
                        <p className="text-xs">
                          Left-click to add breakpoint, Right-click to finish
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Center - Map Canvas */}
      <Card className="col-span-4">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Map: {mapData.name}</h3>
            <div className="flex items-center gap-4">
              {appMode === 'edit' && (
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDrawingMode('tile')}
                      className={`px-3 py-1 text-sm rounded ${
                        drawingMode === 'tile'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      Tiles
                    </button>
                    <button
                      onClick={() => {
                        setDrawingMode('path');
                        setSelectedTile(null); // Clear selected tile when entering path mode
                      }}
                      className={`px-3 py-1 text-sm rounded ${
                        drawingMode === 'path'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      Path
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="placeOnPath"
                      checked={placeOnPathOnly}
                      onChange={e => setPlaceOnPathOnly(e.target.checked)}
                      className="rounded"
                    />
                    <label
                      htmlFor="placeOnPath"
                      className="text-sm text-muted-foreground"
                    >
                      Place tiles on path only
                    </label>
                  </div>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Mode: {appMode === 'edit' ? 'Edit' : 'Comment'} •{' '}
                {mapData.width} × {mapData.height} tiles
                {hasUnsavedChanges && (
                  <span className="text-orange-600 font-medium">
                    {' '}
                    • Unsaved changes
                  </span>
                )}
                {lastSaved && !hasUnsavedChanges && (
                  <span className="text-green-600">
                    {' '}
                    • Saved {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="border border-border rounded overflow-hidden flex justify-center items-center">
            <TileCanvas
              mapData={mapData}
              selectedTile={selectedTile}
              onMapDataChange={newMapData => {
                setMapData(newMapData);
                setHasUnsavedChanges(true);
              }}
              onTileSelect={handleTileSelect}
              drawingMode={drawingMode}
              paths={paths}
              onPathsChange={newPaths => {
                setPaths(newPaths);
                setHasUnsavedChanges(true);
              }}
              placeOnPathOnly={placeOnPathOnly}
              showGrid={showGrid}
              appMode={appMode}
              isDrawingArrow={isDrawingArrow}
              onDrawingArrowChange={setIsDrawingArrow}
              currentArrowPoints={currentArrowPoints}
              onCurrentArrowPointsChange={setCurrentArrowPoints}
              selectedArrowColor={selectedArrowColor}
            />
          </div>

          {/* Click Instructions */}
          <div className="mt-2 text-xs text-muted-foreground text-center">
            <div className="flex justify-center gap-4">
              <span>
                <strong>Left Click:</strong> Draw/Place
              </span>
              <span>
                <strong>Right Click:</strong> Erase/Remove
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right Sidebar - Reserved for Future Use */}
      <Card className="col-span-1 h-full">
        <CardContent className="p-4 h-full flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Tools Panel</h3>
          <div className="flex-1 overflow-auto space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Map Actions</h4>
              <button
                onClick={handleSaveMap}
                className="w-full px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 transition-colors"
              >
                Save Map
              </button>
              <button
                onClick={() => {
                  const maps = JSON.parse(
                    localStorage.getItem('wizardry-maps') || '[]'
                  );
                  setSavedMaps(maps);
                  setShowLoadDialog(true);
                }}
                className="w-full px-3 py-2 bg-secondary text-secondary-foreground text-sm rounded hover:bg-secondary/90 transition-colors"
              >
                Load Map
              </button>
            </div>

            <div className="text-xs text-muted-foreground mt-4">
              <div className="space-y-1">
                <p>Map: {mapData.name}</p>
                <p>
                  Size: {mapData.width} × {mapData.height}
                </p>
                <p>Paths: {paths.length} points</p>
                <p>Layers: {mapData.layers.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Cursor Preview */}
      {selectedTile && globalMousePos && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: globalMousePos.x - 20, // Center the 40px preview
            top: globalMousePos.y - 20,
            width: '40px',
            height: '40px',
          }}
        >
          <canvas
            width={40}
            height={40}
            ref={canvas => {
              if (canvas && selectedTile) {
                const ctx = canvas.getContext('2d')!;
                ctx.clearRect(0, 0, 40, 40);
                ctx.globalAlpha = 0.8; // Semi-transparent
                tileLoader.drawTileForPalette(ctx, selectedTile, 38);
                ctx.globalAlpha = 1.0;
              }
            }}
            className="block"
          />
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              width: '500px',
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 32px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#000',
              }}
            >
              Save Map
            </h3>

            {/* New Map Section */}
            <div
              style={{
                marginBottom: '20px',
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '12px',
                  color: '#000',
                }}
              >
                Save as New Map
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <label
                    htmlFor="mapTitle"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      color: '#000',
                    }}
                  >
                    Map Title
                  </label>
                  <input
                    id="mapTitle"
                    type="text"
                    value={saveTitle}
                    onChange={e => setSaveTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      outline: 'none',
                      fontSize: '13px',
                    }}
                    placeholder="Enter map name..."
                  />
                </div>
                <div>
                  <label
                    htmlFor="mapId"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      color: '#000',
                    }}
                  >
                    Map ID (Optional)
                  </label>
                  <input
                    id="mapId"
                    type="number"
                    min="100000"
                    max="999999"
                    value={saveMapId}
                    onChange={e => setSaveMapId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      outline: 'none',
                      fontSize: '13px',
                    }}
                    placeholder="Leave empty to auto-generate (100000-999999)"
                  />
                </div>
                <button
                  onClick={handleConfirmSave}
                  disabled={!saveTitle.trim()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: saveTitle.trim() ? 'pointer' : 'not-allowed',
                    opacity: saveTitle.trim() ? 1 : 0.5,
                    fontSize: '13px',
                  }}
                >
                  Save New Map
                </button>
              </div>
            </div>

            {/* Existing Maps Section */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '12px',
                  color: '#000',
                }}
              >
                Overwrite Existing Map ({savedMaps.length})
              </h4>
              <div
                style={{
                  height: '200px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              >
                {savedMaps.length === 0 ? (
                  <div
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '13px',
                    }}
                  >
                    No existing maps found.
                  </div>
                ) : (
                  savedMaps.map((map, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px 12px',
                        borderBottom:
                          index < savedMaps.length - 1
                            ? '1px solid #e5e7eb'
                            : 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: '500',
                              color: '#000',
                            }}
                          >
                            {map.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            ID: {map.mapId} • Size: {map.width}×{map.height}
                            {map.metadata?.savedAt &&
                              ` • ${new Date(map.metadata.savedAt).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleOverwriteMap(map)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              borderRadius: '3px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            Overwrite
                          </button>
                          <button
                            onClick={() => handleDeleteMap(map)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#dc2626',
                              color: 'white',
                              borderRadius: '3px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Dialog Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <button
                onClick={() => {
                  handleExportMap();
                  setShowSaveDialog(false);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Export as JSON
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: '8px 16px',
                  color: '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              width: '500px',
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 32px)',
              overflow: 'hidden',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#000',
              }}
            >
              Load Map
            </h3>

            {/* JSON Upload Section */}
            <div
              style={{
                marginBottom: '20px',
                padding: '16px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
              }}
            >
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#000',
                }}
              >
                Import from JSON File
              </h4>
              <input
                type="file"
                accept=".json"
                onChange={handleJsonUpload}
                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              />
              <p
                style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}
              >
                Select a JSON map file to import into local storage
              </p>
            </div>

            {/* Saved Maps List */}
            <div>
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '12px',
                  color: '#000',
                }}
              >
                Saved Maps ({savedMaps.length})
              </h4>
              <div
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              >
                {savedMaps.length === 0 ? (
                  <div
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '14px',
                    }}
                  >
                    No saved maps found. Save a map or import a JSON file to get
                    started.
                  </div>
                ) : (
                  savedMaps.map((map, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        borderBottom:
                          index < savedMaps.length - 1
                            ? '1px solid #e5e7eb'
                            : 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#000',
                            }}
                          >
                            {map.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {map.mapId && `ID: ${map.mapId} • `}
                            Size: {map.width}×{map.height} •
                            {map.metadata?.savedAt
                              ? ` Saved: ${new Date(map.metadata.savedAt).toLocaleDateString()}`
                              : ' No date'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleLoadMap(map)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteMap(map)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc2626',
                              color: 'white',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Dialog Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '20px',
              }}
            >
              <button
                onClick={() => setShowLoadDialog(false)}
                style={{
                  padding: '8px 16px',
                  color: '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapEditor;
