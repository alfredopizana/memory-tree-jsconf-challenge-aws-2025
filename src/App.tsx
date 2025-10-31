import './App.css'
import { Button, Card, Grid, Layout, Container, Loading, FamilyMemberCard, DecorationElement, AltarInterface, ErrorBoundary, OfflineIndicator, FamilyMemberEditor } from './components'
import { FamilyMember, DecorationElement as DecorationData } from './types'
import { DragDropProvider, AccessibilityProvider } from './contexts'
import { CustomDragLayer } from './components/DragLayer/CustomDragLayer'
import { useState } from 'react'

// Sample data for testing
const initialMembers: FamilyMember[] = [
  {
    id: '1',
    name: 'María González',
    preferredName: 'Abuela María',
    dateOfBirth: new Date('1935-05-15'),
    dateOfDeath: new Date('2020-11-02'),
    photos: [],
    generation: 1,
    altarPosition: { level: 1, order: 0 },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'José González',
    preferredName: 'Abuelo José',
    dateOfBirth: new Date('1932-03-20'),
    dateOfDeath: new Date('2018-08-15'),
    photos: [],
    generation: 1,
    altarPosition: { level: 1, order: 1 },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Carmen González',
    preferredName: 'Mamá Carmen',
    dateOfBirth: new Date('1960-12-10'),
    photos: [],
    generation: 2,
    altarPosition: { level: 2, order: 0 },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const initialDecorations: DecorationData[] = [
  {
    id: '1',
    type: 'cempasuchil',
    position: { x: 100, y: 50, level: 1 },
    size: 'medium',
    rotation: 0
  },
  {
    id: '2',
    type: 'papel-picado',
    position: { x: 200, y: 80, level: 2 },
    size: 'large',
    rotation: 15
  },
  {
    id: '3',
    type: 'candle',
    position: { x: 150, y: 120, level: 3 },
    size: 'small',
    rotation: 0
  }
];

function App(): JSX.Element {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(initialMembers);
  const [decorations, setDecorations] = useState<DecorationData[]>(initialDecorations);
  const [showDemo, setShowDemo] = useState(true); // Start with altar demo
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showMemberEditor, setShowMemberEditor] = useState(false);

  const handleMemberMove = (member: FamilyMember, newLevel: number, newOrder: number) => {
    setFamilyMembers(prev => 
      prev.map(m => 
        m.id === member.id 
          ? { ...m, altarPosition: { level: newLevel, order: newOrder } }
          : m
      )
    );
  };

  const handleDecorationMove = (decoration: DecorationData, newPosition: { x: number; y: number; level: number }) => {
    setDecorations(prev =>
      prev.map(d =>
        d.id === decoration.id
          ? { ...d, position: newPosition }
          : d
      )
    );
  };

  const handleDecorationAdd = (type: DecorationData['type'], position: { x: number; y: number; level: number }) => {
    const newDecoration: DecorationData = {
      id: `decoration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      size: 'medium',
      rotation: 0
    };
    setDecorations(prev => [...prev, newDecoration]);
  };

  const handleMemberEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setShowMemberEditor(true);
  };

  const handleMemberSave = (updatedMember: FamilyMember) => {
    setFamilyMembers(prev => 
      prev.map(m => 
        m.id === updatedMember.id 
          ? { ...updatedMember, updatedAt: new Date() }
          : m
      )
    );
    setShowMemberEditor(false);
    setEditingMember(null);
  };

  const handleMemberCreate = () => {
    const newMember: FamilyMember = {
      id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      preferredName: '',
      dateOfBirth: new Date(),
      photos: [],
      generation: 1,
      altarPosition: { level: 3, order: familyMembers.length },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditingMember(newMember);
    setShowMemberEditor(true);
  };

  const handleMemberDelete = (memberId: string) => {
    setFamilyMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleDecorationSelect = (decorationId: string) => {
    console.log('Selected decoration:', decorationId);
    // Could implement decoration editing here
  };

  return (
    <ErrorBoundary culturalContext={true}>
      <AccessibilityProvider>
        <DragDropProvider>
          <Layout variant="altar">
            <Container>
              <OfflineIndicator culturalContext={true} />
              <div className="App">
                <header className="App-header">
                  <h1 id="main-content">Día de los Muertos Memory Tree</h1>
                  <p>Aplicación de altar familiar con funcionalidad de arrastrar y soltar</p>
                  
                  <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Button 
                      variant={showDemo ? "secondary" : "primary"}
                      onClick={() => setShowDemo(!showDemo)}
                      aria-describedby="demo-toggle-description"
                    >
                      {showDemo ? "Mostrar Demo de Componentes" : "Mostrar Altar Familiar"}
                    </Button>
                    
                    {showDemo && (
                      <Button 
                        variant="accent"
                        onClick={handleMemberCreate}
                        aria-label="Crear nuevo miembro de familia"
                      >
                        ➕ Añadir Familiar
                      </Button>
                    )}
                    
                    <div id="demo-toggle-description" className="sr-only">
                      Alterna entre la vista del altar interactivo y la demostración de componentes individuales
                    </div>
                  </div>
                </header>
                
                <main style={{ padding: '2rem 0' }} role="main" aria-label="Contenido principal de la aplicación">
                  {showDemo ? (
                    <AltarInterface
                      familyMembers={familyMembers}
                      decorations={decorations}
                      onMemberMove={handleMemberMove}
                      onDecorationMove={handleDecorationMove}
                      onDecorationAdd={handleDecorationAdd}
                      onMemberEdit={handleMemberEdit}
                      onMemberViewMemories={(memberId: string) => console.log('View memories for:', memberId)}
                      onMemberSelect={(memberId: string) => console.log('Selected member:', memberId)}
                      onDecorationSelect={handleDecorationSelect}
                    />
                  ) : (
                    <Grid columns={3} gap="large">
                      <Card variant="cultural" padding="medium">
                        <h3>Componentes Base</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <Button variant="primary">Botón Primario</Button>
                          <Button variant="secondary">Botón Secundario</Button>
                          <Button variant="accent">Botón de Acento</Button>
                          <Loading variant="cultural" text="Cargando..." />
                        </div>
                      </Card>
                      
                      <Card variant="elevated" padding="medium">
                        <h3>Tarjeta de Miembro Familiar</h3>
                        <FamilyMemberCard 
                          member={initialMembers[0]!}
                          showDetails={true}
                        />
                      </Card>
                      
                      <Card variant="outlined" padding="medium">
                        <h3>Decoraciones</h3>
                        <div style={{ position: 'relative', height: '200px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                          <DecorationElement 
                            decoration={initialDecorations[0]!}
                            isSelected={true}
                          />
                        </div>
                      </Card>
                    </Grid>
                  )}
                </main>
              </div>
            </Container>
          </Layout>
          <CustomDragLayer />
          
          {/* Family Member Editor Modal */}
          {showMemberEditor && editingMember && (
            <FamilyMemberEditor
              member={editingMember}
              isOpen={showMemberEditor}
              onSave={handleMemberSave}
              onCancel={() => {
                setShowMemberEditor(false);
                setEditingMember(null);
              }}
              {...(editingMember.name && {
                onDelete: () => {
                  handleMemberDelete(editingMember.id);
                  setShowMemberEditor(false);
                  setEditingMember(null);
                }
              })}
            />
          )}
        </DragDropProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  )
}

export default App