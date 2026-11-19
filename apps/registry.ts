import { ModuleRegistry } from "@sourciers/module-sdk";
import {
  soundscapesModule,
  soundscapesModuleV11,
} from "@sourciers/soundscapes";
// Explicit composition root. Legacy documents retain their original renderer.
export function createStudioRegistry() {
  return new ModuleRegistry()
    .register(soundscapesModule)
    .register(soundscapesModuleV11);
}
