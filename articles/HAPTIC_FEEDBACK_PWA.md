# Haptic Feedback in PWAs: The Safari 18 "Switch Hack"

For years, Safari on iOS has lacked support for the standard Web Vibration API (`navigator.vibrate`), leaving PWAs feeling less "native" than their Android counterparts. However, with the release of **Safari 18 (iOS 18)**, a new workaround has emerged using native form controls.

## The Problem
Android and Chrome users have enjoyed the `Vibration API` for nearly a decade. On Apple devices, this API is intentionally disabled for privacy and power management reasons. This makes it impossible for web developers to provide tactile feedback for actions like button presses, successful form submissions, or opening modals.

## The Solution: The "Switch Hack"
In Safari 18, Apple added haptic feedback for a new, non-standard HTML attribute: `<input type="checkbox" switch>`. When this specific type of checkbox is toggled, the OS fires a native "Light Impact" haptic pulse identical to the one felt when toggling a switch in the iOS Settings app.

By creating a hidden switch in our PWA and toggling it via JavaScript, we can effectively "bootleg" a haptic API.

### 1. The Implementation

#### HTML Structure
The trigger must be in the DOM and interactable. Using `display: none` can cause Safari to ignore interactions, so we use a "visually hidden" approach.

```html
<!-- Hidden Haptic Trigger for iOS 18+ -->
<label id="haptic-trigger" style="position: fixed; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; pointer-events: none;" aria-hidden="true">
  <input type="checkbox" switch id="haptic-checkbox">
</label>
```

#### JavaScript Utility
A cross-platform utility ensures that both Android (Standard API) and iOS (The Hack) receive feedback.

```javascript
const Haptics = {
    trigger(duration = 30) {
        // 1. Android/Chrome - Standard Vibration API
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }

        // 2. iOS 18+ - Hidden Switch Hack
        // Clicking the LABEL is more reliable for triggering the haptic in Safari 18
        const trigger = document.getElementById("haptic-trigger");
        if (trigger) {
            trigger.click();
        }
    }
};
```

### 2. Integration Points in Glass News
In this application, we have integrated haptics into several key areas to enhance the premium feel:

- **Article Opening**: A stronger pulse (50ms) to simulate the physical opening of a card.
- **Sharing**: Feedback when the share sheet or clipboard confirmation appears.
- **Category Pills**: A subtle "tick" when switching between news categories.
- **UI Controls**: Immediate feedback when clearing search or dismissing banners.

## Requirements & Limitations
- **iOS 18.0+**: This hack relies on WebKit features introduced in late 2024.
- **System Settings**: "System Haptics" must be enabled in the iPhone's **Settings > Sounds & Haptics**.
- **User Intent**: Safari requires the haptic to be triggered as a result of a user gesture (like a click). You cannot trigger it programmatically without an event.
- **Legacy Devices**: This fails silently on iOS 17 and below, providing a graceful fallback where the user simply feels nothing.

By combining the standard Web APIs with these native platform quirks, we can bridge the gap between web and native mobile experiences.
