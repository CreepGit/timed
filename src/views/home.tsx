import { Page } from "../components/page.tsx"

export const Home = () => {
  return (
    <Page title="Timed">
      <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        <h1 className="text-2xl font-bold">Home / Timed</h1>
        <p>Welcome to Timed. Ask for a link from a friend or create a new room below.</p>
        <div className="divider"></div>
        <h2>Create a new room</h2>

        <form className="flex flex-col gap-2" action="/r" method="post" style={{ maxWidth: '40rch' }}>
          <input type="text" name="name" id="name" placeholder="Room name" />
          <button type="submit" className="btn btn-primary">Create room</button>
        </form>

      </div>
    </Page>
  )
}
