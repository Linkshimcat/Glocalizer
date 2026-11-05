interface Props { image: string; caption: string; title: string; note: string }
export default function LaunchPreview({ image, caption, title, note }: Props) {
  return <section className="demo-panel" aria-label={title}>
    <h2>{title}</h2><p className="demo-muted">{note}</p>
    <div className="demo-chat"><p className="demo-bubble">…</p><div className="demo-message"><img src={image} alt={caption} /><p>{caption}</p></div></div>
  </section>
}
