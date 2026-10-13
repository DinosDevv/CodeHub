import { Coffee, Play } from 'lucide-react'
import { Button, Card, EmptyState, PageHeader } from '../components/ui'
import { useNow } from '../hooks/useNow'
import { greeting } from '../lib/greeting'

export function Dashboard(): React.JSX.Element {
  const now = useNow()
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <PageHeader
        title={`${greeting(now)} ☾`}
        subtitle={`it's ${time} — grab a drink, settle in`}
        actions={
          <Button disabled title="Coming in the Sessions phase">
            <Play size={16} /> start session
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="today" delay={60}>
          <p className="font-mono text-3xl font-light">0h 00m</p>
        </Card>
        <Card title="this week" delay={120}>
          <p className="font-mono text-3xl font-light">0h 00m</p>
        </Card>
        <Card title="streak" delay={180}>
          <p className="font-mono text-3xl font-light">
            0 <span className="text-base text-muted">days</span>
          </p>
        </Card>
        <Card title="open tasks" className="lg:col-span-2" delay={240}>
          <EmptyState>nothing on the list yet — enjoy the quiet.</EmptyState>
        </Card>
        <Card title="repo check-in" delay={300}>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Coffee size={16} className="text-accent" /> all clean & cozy.
          </div>
        </Card>
      </div>
    </>
  )
}
