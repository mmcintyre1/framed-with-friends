import { useState, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { useUser } from "../context/UserContext"
import { supabase } from "../lib/supabase"
import { hashPin } from "../lib/hash"
import Avatar, { PRESET_AVATARS } from "./Avatar"

const NAV = [
  { to: "/", label: "Today" },
  { to: "/history", label: "History" },
  { to: "/leaderboard", label: "Leaders" },
]

const REMEMBERED_KEY = 'fwf_remembered'

function ProfileModal({ onClose }) {
  const { user, updateUser, logout } = useUser()
  const [tab, setTab] = useState("avatar")
  const [newName, setNewName] = useState(user.name)
  const [namePin, setNamePin] = useState("")
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState("")
  const [nameSuccess, setNameSuccess] = useState(false)
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [pinSaving, setPinSaving] = useState(false)
  const [pinError, setPinError] = useState("")
  const [pinSuccess, setPinSuccess] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef(null)

  const handleNameChange = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !namePin) return
    setNameSaving(true); setNameError("")
    const hashed = await hashPin(namePin)
    const { data: verified } = await supabase
      .from("players").select("id").eq("id", user.id).eq("pin", hashed).single()
    if (!verified) { setNameError("Wrong PIN."); setNameSaving(false); return }
    const { error } = await supabase.from("players").update({ name: newName.trim() }).eq("id", user.id)
    setNameSaving(false)
    if (error) { setNameError(error.message); return }
    updateUser({ ...user, name: newName.trim() })
    setNameSuccess(true)
    setTimeout(() => { setNameSuccess(false); onClose() }, 1000)
  }

  const handlePinChange = async (e) => {
    e.preventDefault()
    if (!currentPin || !newPin) return
    setPinSaving(true); setPinError("")
    const hashedCurrent = await hashPin(currentPin)
    const { data: verified } = await supabase
      .from("players").select("id").eq("id", user.id).eq("pin", hashedCurrent).single()
    if (!verified) { setPinError("Current PIN is wrong."); setPinSaving(false); return }
    const hashedNew = await hashPin(newPin)
    const { error } = await supabase.from("players").update({ pin: hashedNew }).eq("id", user.id)
    setPinSaving(false)
    if (error) { setPinError(error.message); return }
    // Keep the remembered token up to date
    try {
      const remembered = JSON.parse(localStorage.getItem(REMEMBERED_KEY) || '{}')
      if (remembered[user.id]) {
        remembered[user.id] = hashedNew
        localStorage.setItem(REMEMBERED_KEY, JSON.stringify(remembered))
      }
    } catch {}
    setPinSuccess(true)
    setTimeout(() => { setPinSuccess(false); onClose() }, 1000)
  }

  const handleAvatarSelect = async (emoji) => {
    setAvatarSaving(true)
    await supabase.from("players").update({ avatar: emoji }).eq("id", user.id)
    updateUser({ ...user, avatar: emoji })
    setAvatarSaving(false)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarSaving(true)
    setUploadError("")
    const ext = file.name.split('.').pop()
    const path = `${user.id}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadErr) {
      setUploadError("Upload failed — create an 'avatars' public bucket in Supabase Storage.")
      setAvatarSaving(false)
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from("players").update({ avatar: data.publicUrl }).eq("id", user.id)
    updateUser({ ...user, avatar: data.publicUrl })
    setAvatarSaving(false)
  }

  const handleForgetDevice = () => {
    try {
      const remembered = JSON.parse(localStorage.getItem(REMEMBERED_KEY) || '{}')
      delete remembered[user.id]
      localStorage.setItem(REMEMBERED_KEY, JSON.stringify(remembered))
    } catch {}
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar avatar={user.avatar} name={user.name} size="md" />
            <h2 className="font-semibold text-zinc-100">{user.name}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg">✕</button>
        </div>

        <div className="flex gap-2">
          {["avatar", "name", "pin"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}>
              {t === "avatar" ? "Avatar" : t === "name" ? "Name" : "PIN"}
            </button>
          ))}
        </div>

        {tab === "avatar" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">Pick an avatar</p>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleAvatarSelect(emoji)}
                  disabled={avatarSaving}
                  className={`h-10 w-full rounded-xl text-xl flex items-center justify-center transition-colors disabled:opacity-50 ${
                    user.avatar === emoji
                      ? 'bg-emerald-500/20 border border-emerald-500'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarSaving}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors disabled:opacity-40"
              >
                {avatarSaving ? 'Uploading…' : 'Upload photo'}
              </button>
              {user.avatar && (
                <button
                  onClick={() => handleAvatarSelect(null)}
                  disabled={avatarSaving}
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-500 transition-colors disabled:opacity-40"
                >
                  Remove
                </button>
              )}
            </div>
            {uploadError && <p className="text-red-400 text-xs">{uploadError}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        )}

        {tab === "name" && (
          <form onSubmit={handleNameChange} className="space-y-3">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="New name" autoFocus
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-emerald-500 outline-none text-zinc-100 placeholder-zinc-600" />
            <input type="password" inputMode="numeric" maxLength={6} value={namePin}
              onChange={e => setNamePin(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Confirm with PIN"
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-emerald-500 outline-none text-zinc-100 placeholder-zinc-600" />
            {nameError && <p className="text-red-400 text-sm">{nameError}</p>}
            <button type="submit" disabled={nameSaving || !newName.trim() || !namePin}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-semibold transition-colors">
              {nameSuccess ? "Saved" : nameSaving ? "Saving..." : "Save name"}
            </button>
          </form>
        )}

        {tab === "pin" && (
          <form onSubmit={handlePinChange} className="space-y-3">
            <input type="password" inputMode="numeric" maxLength={6} value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Current PIN" autoFocus
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-emerald-500 outline-none text-zinc-100 placeholder-zinc-600" />
            <input type="password" inputMode="numeric" maxLength={6} value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ""))} placeholder="New PIN"
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-emerald-500 outline-none text-zinc-100 placeholder-zinc-600" />
            {pinError && <p className="text-red-400 text-sm">{pinError}</p>}
            <button type="submit" disabled={pinSaving || !currentPin || !newPin}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-semibold transition-colors">
              {pinSuccess ? "Updated" : pinSaving ? "Saving..." : "Update PIN"}
            </button>
          </form>
        )}

        <div className="flex gap-2 pt-1 border-t border-zinc-800">
          <button onClick={handleForgetDevice}
            className="flex-1 py-2 text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
            Forget device
          </button>
          <button onClick={() => { logout(); onClose() }}
            className="flex-1 py-2 text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const { user } = useUser()
  const { pathname } = useLocation()
  const [showProfile, setShowProfile] = useState(false)

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-4">
      <div className="sticky top-0 z-40 bg-zinc-950 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold tracking-tight text-zinc-100">
            Framed<span className="text-emerald-400"> w/ Friends</span>
          </h1>
          {user && (
            <button onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              <Avatar avatar={user.avatar} name={user.name} size="xs" />
              {user.name}
            </button>
          )}
        </div>
        <div className="flex border-b border-zinc-800">
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to}
              className={`flex-1 text-center py-2.5 text-sm font-medium transition-colors relative ${pathname === to ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
              {label}
              {pathname === to && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />}
            </Link>
          ))}
        </div>
      </div>
      <main className="flex-1 pt-4 pb-8">{children}</main>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  )
}
