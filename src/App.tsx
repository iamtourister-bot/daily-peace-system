import SleepStories from "@/pages/SleepStories";
import CalmingRoom from "@/pages/CalmingRoom";
import { Layout } from "@/components/Layout";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SessionProvider } from "@/contexts/SessionContext";

import Welcome from "@/pages/Welcome";
import StateEntry from "@/pages/StateEntry";
import AutoPath from "@/pages/AutoPath";
import QuickReset from "@/pages/QuickReset";
import FullReset from "@/pages/FullReset";
import Insight from "@/pages/Insight";
import Night from "@/pages/Night";
import Crisis from "@/pages/Crisis";
import Speak from "@/pages/Speak";
import Learn from "@/pages/Learn";
import About from "@/pages/About";
import AudioCalm from "@/pages/AudioCalm";
import Meditations from "@/pages/Meditations";
import Gratitude from "@/pages/Gratitude";
import Techniques from "@/pages/Techniques";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Welcome} />
        <Route path="/state" component={StateEntry} />
        <Route path="/path" component={AutoPath} />
        <Route path="/quick-reset" component={QuickReset} />
        <Route path="/full-reset" component={FullReset} />
        <Route path="/insight" component={Insight} />
        <Route path="/night" component={Night} />
        <Route path="/crisis" component={Crisis} />
        <Route path="/speak" component={Speak} />
        <Route path="/learn" component={Learn} />
        <Route path="/about" component={About} />
        <Route path="/audio-calm" component={AudioCalm} />
        <Route path="/meditations" component={Meditations} />
        <Route path="/gratitude" component={Gratitude} />
        <Route path="/techniques" component={Techniques} />
        <Route path="/calming-room" component={CalmingRoom} />
        <Route path="/sleep-stories" component={SleepStories} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <AppRouter />
        </WouterRouter>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App;
