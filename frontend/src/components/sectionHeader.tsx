export function sectionHeader(number: string, title: string) {
  return (
    <div className="flex items-center gap-2.5 pb-2 border-b border-border">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary font-mono">
        {number}
      </span>
      <h4 className="text-sm font-bold tracking-tight text-foreground">{title}</h4>
    </div>
  )
}

export default sectionHeader
