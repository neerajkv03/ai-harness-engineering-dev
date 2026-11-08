import { LearningLayout } from "@/components/learning/LearningLayout"
import { TooltipProvider } from "@/components/ui/tooltip"
import { topics } from "@/data/learning"

export default function App() {
  return (
    <TooltipProvider>
      <LearningLayout topics={topics} />
    </TooltipProvider>
  )
}
