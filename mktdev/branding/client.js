/**
 * MKTDEV brand, browser half.
 *
 * Occupies the generic sidebar brand slots with the MKTDEV mark and wordmark.
 * The slots are single-slot and root-scoped, declared by
 * `@deepseek-ai/dsh-client-ui-sidebar`, which renders a fish mark and a
 * local-build label as fallbacks; registering here replaces both.
 *
 * Loaded as a classic script by the client module table, so the bundle only
 * registers a factory and every side effect stays inside it.
 */
window.__ModuleLoader__.load({
  id: '@mktdev/brand',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /**
     * Render the round Niger flag badge.
     *
     * One component for both brand surfaces, so the sidebar and the hero show
     * literally the same mark. The flag bands and disc are clipped to the
     * circle, and a thin gold ring keeps the edge crisp on the sand background
     * and on the night one alike.
     * @param props - Requested diameter in pixels, the host class, and a
     * discriminator used to keep the clip path id unique per surface.
     * @returns the flag badge.
     */
    function FlagBadge({ diameter, className, id }) {
      const clip = `mktdev-flag-${id}`
      return h('svg', {
        className,
        width: diameter,
        height: diameter,
        viewBox: '0 0 1 1',
        role: 'img',
        'aria-label': 'Drapeau du Niger',
        style: { display: 'block', flex: 'none' },
      },
      h('defs', null, h('clipPath', { id: clip }, h('circle', { cx: 0.5, cy: 0.5, r: 0.5 }))),
      h('g', { clipPath: `url(#${clip})` },
        h('rect', { x: 0, y: 0, width: 1, height: 0.334, fill: '#E05206' }),
        h('rect', { x: 0, y: 0.334, width: 1, height: 0.333, fill: '#FFFFFF' }),
        h('rect', { x: 0, y: 0.667, width: 1, height: 0.333, fill: '#0DB02B' }),
        h('circle', { cx: 0.5, cy: 0.5, r: 0.14, fill: '#E05206' })),
      h('circle', { cx: 0.5, cy: 0.5, r: 0.48, fill: 'none', stroke: '#C49A3C', strokeWidth: 0.04 }))
    }

    /**
     * Sidebar mark: the flag badge at the size the sidebar requests, which is
     * the footprint the replaced monogram used.
     * @param props - Host-supplied mark presentation.
     * @returns the flag badge.
     */
    function Mark({ size }) {
      return h(FlagBadge, { diameter: size, id: 'sidebar' })
    }

    /** Render the MKTDEV wordmark without its independently slotted mark. */
    function Name() {
      return h('span', {
        style: {
          fontWeight: 600,
          fontSize: '13px',
          letterSpacing: '0.14em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        },
      }, 'MKTDEV')
    }

    /**
     * Conversation hero mark: the same badge, scaled down.
     *
     * The host passes the page's mark geometry through `className`, so the
     * element adopts it instead of imposing its own layout. The diameter is
     * deliberately smaller than the requested `size`, which is measured for
     * the upstream animated fish.
     * @param props - Host-supplied mark presentation.
     * @returns the flag badge.
     */
    function HeroMark({ size, className }) {
      return h(FlagBadge, { diameter: Math.round(size * 0.62), className, id: 'hero' })
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        // Both occupants install as one set: the inner injection waits on the
        // name slot's declaration, so a late-declaring sidebar still gets both.
        ctx.slots.inject('sidebar.brand.mark', () =>
          ctx.slots.inject('sidebar.brand.name', function* () {
            yield ctx.slots.register({ name: 'sidebar.brand.mark' }, Mark)
            yield ctx.slots.register({ name: 'sidebar.brand.name' }, Name)
          }))
        // The conversation hero declares its own mark slot and upstream leaves
        // it on an animated fish, so this is the only place the DeepSeek mark
        // would otherwise survive.
        ctx.slots.inject('conversation.hero.brand.mark', () =>
          ctx.slots.register({ name: 'conversation.hero.brand.mark' }, HeroMark))
      },
    }
  },
})
