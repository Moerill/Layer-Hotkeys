export default function () {
  Hooks.once("ready", async () => {
    CONFIG["layer-hotkeys"] = {
      layer: {},
      tool: {},
    };
    const DEFAULT_KEYS = {
      token: "t",
      measure: "m",
      tiles: "i",
      drawings: "d",
      walls: "w",
      lighting: "l",
      sounds: "s",
      notes: "n",
    };

    let maxNumTools = 0;
    for (let control of ui.controls.controls) {
      // Skip controls  that aren't accessible for the user
      if (control.visible == false) continue;

      game.settings.register("layer-hotkeys", "control-" + control.name, {
        name: control.title,
        hint:
          game.i18n.localize("LAYER-HOTKEYS.ControlsHint") +
          " " +
          game.i18n.localize(control.title),
        scope: "user",
        config: true,
        default: DEFAULT_KEYS[control.name] || null,
        type: window.Azzu.SettingsTypes.KeyBinding,
        onChange: (key) => {
          CONFIG["layer-hotkeys"].layer[control.name] = key;
        },
      });
      CONFIG["layer-hotkeys"].layer[control.name] = game.settings.get(
        "layer-hotkeys",
        "control-" + control.name
      );
      maxNumTools = Math.max(control.tools.length, maxNumTools);
    }

    for (let i = 1; i <= maxNumTools; i++) {
      game.settings.register("layer-hotkeys", "tool-" + i, {
        name: game.i18n.localize("LAYER-HOTKEYS.ToolName") + " " + i,
        hint:
          game.i18n.localize("LAYER-HOTKEYS.ToolsHint") +
          " " +
          game.i18n.localize("LAYER-HOTKEYS.ToolName") +
          " " +
          i,
        scope: "user",
        config: true,
        default: (i % 10).toString() || "0",
        type: window.Azzu.SettingsTypes.KeyBinding,
        onChange: (key) => {
          CONFIG["layer-hotkeys"].tool[i] = key;
        },
      });
      CONFIG["layer-hotkeys"].tool[i] = game.settings.get(
        "layer-hotkeys",
        "tool-" + i
      );
    }
  });

  Hooks.on("renderExtendedSettingsConfig", (app, html, data) => {
    // Force rerender of controls on submitting settings, so the titles get updated
    html.find("button:submit").on("click", (ev) => ui.controls.render());
  });

  Hooks.once("init", () => {
    window.addEventListener(
      "keydown",
      (ev) => {
        if (ev.repeat) return true;

        if (document.activeElement.tagName !== "BODY") return true;

        for (let control of ui.controls.controls) {
          // Skip controls  that aren't accessible for the user
          if (control.visible == false) continue;

          const key = window.Azzu.SettingsTypes.KeyBinding.parse(
            CONFIG["layer-hotkeys"].layer[control.name]
          );
          if (window.Azzu.SettingsTypes.KeyBinding.eventIsForBinding(ev, key)) {
            ev.preventDefault();
            ev.stopPropagation();
            canvas.getLayer(control.layer).activate();

            let keyUpStopper = (ev) => {
              const key = window.Azzu.SettingsTypes.KeyBinding.parse(
                CONFIG["layer-hotkeys"].layer[control.name]
              );
              const isKey = window.Azzu.SettingsTypes.KeyBinding.eventIsForBinding(
                ev,
                key
              );
              if (isKey) {
                ev.preventDefault();
                ev.stopPropagation();
                window.removeEventListener("keyup", keyUpStopper);
                return false;
              }
            };
            window.addEventListener("keyup", keyUpStopper, {
              useCapture: true,
            });

            return false;
          }
        }

        const activeControl = ui.controls.controls.find(
          (e) => e.name === ui.controls.activeControl
        );
        const tools =
          activeControl.tools.filter((e) => e.visible !== false) || [];
        for (let i = 0; i < tools.length; i++) {
          const key = window.Azzu.SettingsTypes.KeyBinding.parse(
            CONFIG["layer-hotkeys"].tool[i + 1]
          );
          let activateTool = window.Azzu.SettingsTypes.KeyBinding.eventIsForBinding(
            ev,
            key
          );
          //extra check for wall chaining
          if (activeControl.name === "walls") {
            key.ctrlKey = true;
            activateTool =
              activateTool ||
              window.Azzu.SettingsTypes.KeyBinding.eventIsForBinding(ev, key);
          }
          if (activateTool) {
            ev.preventDefault();
            ev.stopPropagation();

            if (tools[i].onClick) tools[i].onClick();
            else {
              activeControl.activeTool = tools[i].name;
              ui.controls.render();
            }
            // Change preview color for walls when chaining walls
            if (activeControl.name === "walls") {
              let layer = canvas.activeLayer;
              if (layer.preview.children[0]) {
                let wall = layer.preview.children[0];
                const wall_data = layer._getWallDataFromActiveTool(
                  game.activeTool
                );
                let data = wall.data;
                wall_data.c = data.c;
                wall.data = wall_data;
              }
            }

            let keyUpStopper = (ev) => {
              const key = window.Azzu.SettingsTypes.KeyBinding.parse(
                CONFIG["layer-hotkeys"].tool[i + 1]
              );
              const isKey = window.Azzu.SettingsTypes.KeyBinding.eventIsForBinding(
                ev,
                key
              );
              if (isKey) {
                ev.preventDefault();
                ev.stopPropagation();
                window.removeEventListener(keyUpStopper);
                return false;
              }
            };
            window.addEventListener("keyup", keyUpStopper);

            return false;
          }
        }
        return true;
      },
      { useCapture: true }
    );
  });

  Hooks.on("renderSceneControls", (app, html, data) => {
    let scene_control = html.children("li.scene-control");
    let layerKeys = {};
    let config = CONFIG["layer-hotkeys"];
    if (config === undefined) return;

    for (let [key, value] of Object.entries(config.layer))
      layerKeys[value] = key;
    let toolKeys = {};
    for (let [key, value] of Object.entries(config.tool)) toolKeys[value] = key;

    for (let i = 0; i < scene_control.length; i++) {
      const li = scene_control[i];
      let title = li.getAttribute("title");
      let key = config.layer[li.getAttribute("data-control")];
      if (key !== undefined) li.title += " [" + key.toUpperCase() + "]";
      let ctrls = li.getElementsByClassName("control-tool");
      for (let j = 0; j < ctrls.length; j++) {
        let title = ctrls[j].title + " [" + config.tool[j + 1] + "]";
        ctrls[j].title = title;
      }
    }
  });
}
