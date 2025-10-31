import './App.css'
import { Button, Card, Grid, Layout, Container, Loading, FamilyMemberCard, DecorationElement, AltarInterface } from './components'
import { FamilyMember, DecorationElement as DecorationData } from './types'
import { DragDropProvider } from './contexts'
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
  const [showDemo, setShowDemo] = useState(false);

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

  return (
    <DragDropProvider>
      <Layout variant="altar">
        <Container>
          <div className="App">
            <header className="App-header">
              <h1>Día de los Muertos Memory Tree</h1>
              <p>Family memory altar application with drag & drop functionality</p>
              
              <div style={{ margin: '1rem 0' }}>
                <Button 
                  variant={showDemo ? "secondary" : "primary"}
                  onClick={() => setShowDemo(!showDemo)}
                >
                  {showDemo ? "Show Components Demo" : "Show Altar Demo"}
                </Button>
              </div>
            </header>
            
            <main style={{ padding: '2rem 0' }}>
              {showDemo ? (
                <AltarInterface
                  familyMembers={familyMembers}
                  decorations={decorations}
                  onMemberMove={handleMemberMove}
                  onDecorationMove={handleDecorationMove}
                  onMemberEdit={(member) => console.log('Edit member:', member)}
                  onMemberViewMemories={(memberId) => console.log('View memories for:', memberId)}
                  onMemberSelect={(memberId) => console.log('Selected member:', memberId)}
                  onDecorationSelect={(decorationId) => console.log('Selected decoration:', decorationId)}
                />
              ) : (
                <Grid columns={3} gap="large">
                  <Card variant="cultural" padding="medium">
                    <h3>Base Components</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <Button variant="primary">Primary Button</Button>
                      <Button variant="secondary">Secondary Button</Button>
                      <Button variant="accent">Accent Button</Button>
                      <Loading variant="cultural" text="Cargando..." />
                    </div>
                  </Card>
                  
                  <Card variant="elevated" padding="medium">
                    <h3>Family Member Card</h3>
                    <FamilyMemberCard 
                      member={initialMembers[0]!}
                      showDetails={true}
                    />
                  </Card>
                  
                  <Card variant="outlined" padding="medium">
                    <h3>Decorations</h3>
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
    </DragDropProvider>
  )
}

export default App