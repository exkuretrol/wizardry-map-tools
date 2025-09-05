import MapEditor from './components/editor/MapEditor'

function App() {
  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <header className="border-b border-border p-4 flex-shrink-0">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Wizardry Map Tools</h1>
          <p className="text-muted-foreground">RPG Tile Map Editor</p>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4 overflow-hidden">
        <MapEditor />
      </main>
    </div>
  )
}

export default App
