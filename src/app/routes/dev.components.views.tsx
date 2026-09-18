import { ui } from '../../kit.ts'
import type { FC } from 'hono/jsx'
import type { TKvResponse } from '../../pocketbase-types.ts'

type ComponentsPageProps = {
  signal: TKvResponse
}

export const ComponentsPage: FC<ComponentsPageProps> = ({ signal }) => {
  const signalText = (signal.value as any)?.text ?? "unknown"
  const signalValue = ((signal.value as any)?.text ?? "").length

  return <ui.Page title="Components">
    <div style={{ padding: 'min(2rem, 5vw)', maxWidth: '1600px', margin: '0 auto' }}>

      <p>
        <ui.IconSpan icon="icon-[tabler--stack-2]" size={5} />
        <span> Components </span>
        (<a href="/" className="link link-accent link-animated">back</a>)
      </p>
      <div className="divider py-5"></div>

      <div className="card bg-base-100" data-signals__ifmissing="{ _locked: false, _enabled: false }">
        <div className="card-body gap-6">
          <h4 className="text-2xl"><ui.IconSpan icon="icon-[tabler--aspect-ratio]" size={8} /> <span className="ml-3">Component library</span><span className="ml-5">[{ signalText }]</span></h4>
          
          <div className="flex gap-2">
            <button className="btn btn-primary" data-on:click="@post('/changesignal')">Signal Change</button>
            <button className="btn btn-warning" data-on:click="@get('/alwaysfails')">Always Fails</button>
          </div>
          
          <p><ui.IconSpan icon="icon-[tabler--code]" className="text-success" size={5} /> This is some text <ui.IconSpan icon="icon-[tabler--heart]" className="text-error" size={5} /> that should contain some inlined icons <ui.IconSpan icon="icon-[tabler--question-mark]" size={5} /> for emphasis! Just making this longer to show word wrapping at the end of the paragraph. <ui.IconSpan icon="icon-[tabler--ghost-off]" size={5} /></p>
          <div className="flex flex-wrap items-center gap-2">
            <ui.Badge color="success" icon="icon-[tabler--check]">Success</ui.Badge>
            <ui.Badge color="warning" variant="dash" icon="icon-[tabler--clock]">Pending</ui.Badge>
            <ui.Badge color="error" variant="soft" icon="icon-[tabler--x]">Cancelled</ui.Badge>
            {/* A Square: */}
            <ui.Badge color="info" variant="solid" icon="icon-[tabler--code]" className="p-0 size-5"></ui.Badge>
          </div>

          <div className="flex flex-col gap-0">
            <ui.Breadcrumbs items={[
              { label: "Home", href: "/", icon: "icon-[tabler--home]" },
              { label: "Dev", href: "/dev", icon: "icon-[tabler--code]" },
              { label: "Components", icon: "icon-[tabler--stack-2]" },
            ]} />
            <ui.Breadcrumbs items={[
              { label: "Home", href: "/" },
              { label: "Dev", href: "/dev" },
              { label: "Components" },
            ]} />
            <ui.Breadcrumbs separator="icon-[tabler--slash]" items={[
              { label: "Home", href: "/" },
              { label: "Dev", href: "/dev" },
              { label: "Components" },
            ]} />
          </div>

          <ui.Stats
            className="max-md:stats-vertical"
            items={[
              { title: "Website Traffic", value: "32K", desc: <span>5% {
                <ui.IconSpan icon="icon-[tabler--arrow-up-right]" size={3} />
              } from last week</span>, icon: "icon-[tabler--world]" },
              { title: "Incidents", value: "41", desc:<span>60%
                <ui.IconSpan icon="icon-[tabler--arrow-down-right]" size={3} className="text-error" /> past 14 days</span>, icon: "icon-[tabler--alert-circle]" },
              { title: "Server Health", value: "99.3%", desc: "Uptime 3 days, 11 hours", icon: "icon-[tabler--heartbeat]", color: "success" },
            ]}
          />

          <div className="flex gap-5 flex-wrap">
            <div className="flex items-center gap-2">
              <ui.Swap
                onIcon="icon-[tabler--lock]"
                offIcon="icon-[tabler--lock-open]"
                effect="none"
                size={7}
                data-bind="_locked"
              />
              <ui.Badge color='warning' variant='soft' data-show="$_locked" style={{ display: 'none' }}>Locked</ui.Badge>
              {/* Disabling one so there's no flash on reload */}
              <ui.Badge color='success' variant='soft' data-show="!$_locked">Unlocked</ui.Badge>
            </div>
            <div className="flex items-center gap-2">
              <ui.Switch id="dev-switch-enabled" color="primary" data-bind="_enabled" />
              <ui.Badge color='success' variant='soft' icon='icon-[tabler--check]' data-show="$_enabled" style={{ display: 'none' }}>Enabled</ui.Badge>
              <ui.Badge color='warning' variant='soft' icon='icon-[tabler--x]' data-show="!$_enabled">Disabled</ui.Badge>
            </div>
          </div>

          <ui.Menu
            horizontal
            items={[
              { href: "/", icon: "icon-[tabler--home]", ariaLabel: "Home Link" },
              { href: "#", icon: "icon-[tabler--user]", ariaLabel: "User Link" },
              { href: "#", icon: "icon-[tabler--message]", ariaLabel: "Message Link" },
            ]}
          />

          <ui.Menu
            className="w-fit" /* Prevents full width when horizontal:md doesn't pass */
            horizontal="md"
            items={[
              { href: "#", label: "Inbox", icon: "icon-[tabler--mail]", badge: <ui.Badge size="sm" color="primary">1K+</ui.Badge> },
              { href: "#", label: "Updates", icon: "icon-[tabler--info-circle]", badge: <ui.Badge size="sm" color="warning">NEW</ui.Badge> },
              { href: "#", label: "Status", badge: <ui.Badge color="success" className="p-0 size-3"></ui.Badge> },
              { label: "Signal", icon: "icon-[tabler--cell-signal-5]", badge: <ui.Badge color="info">{signalValue}</ui.Badge>, onClick: "@post('/changesignal')" },
            ]}
          />

          <div className="flex flex-wrap items-start gap-6">
            <ui.Menu
              items={[
                { title: true, label: "Apps" },
                { href: "#", label: "Chat", icon: "icon-[tabler--message]" },
                { href: "#", label: "Calendar", icon: "icon-[tabler--calendar]" },
                { href: "#", label: "Academy", icon: "icon-[tabler--book]" },
              ]}
            />

            <ui.Menu
              id="dev-menu-accordion"
              accordion
              alwaysOpen
              className="w-64"
              items={[
                { href: "#", label: "Home", icon: "icon-[tabler--home]" },
                {
                  id: "apps",
                  label: "Apps",
                  icon: "icon-[tabler--apps]",
                  open: true,
                  children: [
                    { href: "#", label: "Chat", icon: "icon-[tabler--message]" },
                    { href: "#", label: "Calendar", icon: "icon-[tabler--calendar]" },
                    {
                      id: "academy",
                      label: "Academy",
                      icon: "icon-[tabler--book]",
                      children: [
                        { href: "#", label: "Courses", icon: "icon-[tabler--books]" },
                        { href: "#", label: "Course details", icon: "icon-[tabler--list-details]" },
                        {
                          id: "stats",
                          label: "Stats",
                          icon: "icon-[tabler--chart-bar]",
                          children: [
                            { href: "#", label: "Goals", icon: "icon-[tabler--chart-donut]" },
                          ],
                        },
                      ],
                    },
                  ],
                },
                { href: "#", label: "Settings", icon: "icon-[tabler--settings]" },
                {
                  id: "more",
                  label: "More Apps",
                  icon: "icon-[tabler--apps]",
                  children: [
                    { href: "#", label: "Clock", icon: "icon-[tabler--clock]" },
                    { href: "#", label: "Files", icon: "icon-[tabler--file-text]" },
                    { href: "#", label: "Camera", icon: "icon-[tabler--camera]" },
                    {
                      id: "reports",
                      label: "Reports",
                      icon: "icon-[tabler--clipboard-list]",
                      children: [
                        { href: "#", label: "Daily Report", icon: "icon-[tabler--clipboard-check]" },
                        { href: "#", label: "Weekly Report", icon: "icon-[tabler--clipboard-x]" },
                      ],
                    },
                  ],
                },
              ]}
            />

            <ui.Dropdown
              id="dev-dropdown-default"
              label="Dropdown"
              items={[
                { href: "#", label: "My Profile" },
                { href: "#", label: "Settings" },
                { href: "#", label: "Billing" },
                { href: "#", label: "FAQs" },
                { label: "Signal", icon: "icon-[tabler--cell-signal-5]", badge: <ui.Badge color="info">{signalValue}</ui.Badge>, onClick: "@post('/changesignal')" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  </ui.Page>
}
