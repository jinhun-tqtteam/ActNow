# 🚀 Quick Test: Drag Fixed!

## ⚡ 3 Steps (15 seconds):

### 1. Reload Extension
```
chrome://extensions/ → Click "Reload"
```

### 2. Open Console & Check
```
F12 → Console → Reload page

MUST SEE:
✅ Drag listener attached to header
```

### 3. Test Drag
```
1. Open chat
2. Hover header (purple bar)
   → Cursor becomes ✋ (move icon)
3. Click & hold on header (not buttons!)
4. Drag mouse
   → Window follows! 🎉
5. Release
   → Console: 💾 Position saved
```

---

## ✅ What You Should See:

### Before Drag:
```
┌────────────────┐
│ Header ← Hover here (cursor: ✋)
├────────────────┤
│  Content       │
└────────────────┘
```

### During Drag:
```
Console:
🖱️ handleDragStart called
✅ Drag started at: {x: ..., y: ...}

     ┌────────────────┐
     │ Header (grabbing ✊)
     ├────────────────┤
     │  Content       │ ← Moves with mouse!
     └────────────────┘
```

### After Release:
```
Console:
🖱️ Drag ended
💾 Position saved: {x: 300, y: 200}

Window stays at new position!
```

---

## ❌ If Not Working:

### Check Console:
```
❌ Header element not found for drag
```
→ **Solution:** Reload extension again + Hard refresh page (Ctrl+Shift+R)

### Check Header:
```javascript
// Type in Console:
window.ActNowInstance.shadowRoot.getElementById('actnow-chat-header')
```
→ **Should return:** Element (not null)

### Still Not Working?
```javascript
// Force reload:
location.reload(true)
```

---

## 🎯 Success = All These Work:

- ✅ Hover header → Cursor = ✋ (move)
- ✅ Click header → Console logs
- ✅ Drag → Window moves
- ✅ Release → Position saved
- ✅ Reload → Same position
- ✅ Buttons still work (don't drag)

---

**Total time: 15 seconds**
**Expected result: Drag works perfectly! 🎊**
