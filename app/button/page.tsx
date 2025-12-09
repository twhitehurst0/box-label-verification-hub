/**
 * Industrial Button Demo Page
 *
 * Showcases the industrial-style animated button components:
 * - AnimatedButton: Toggle switch with steel mechanism and glass tube
 * - EnterButton: Press-action button with same aesthetic
 *
 * @route /button
 */

import AnimatedButton from "@/components/button/animated-button"
import EnterButton from "@/components/button/enter-button"

export default function ButtonPage() {
  return (
    <div className="flex flex-col">
      <EnterButton />
      <AnimatedButton />
    </div>
  )
}
