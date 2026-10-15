import { NearMap } from "@/components/near-map"
import { CONTAINER } from "@/components/shell"
import { getMapItems } from "@/lib/queries"
import { createClient, getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Near you" }

// F-101: volunteering, events and communities on a map around you.
export default async function NearbyPage() {
  const userId = await getUserId()
  const supabase = await createClient()
  const [items, profile] = await Promise.all([
    getMapItems(),
    userId ? supabase.from("profiles").select("location").eq("id", userId).maybeSingle() : null,
  ])
  // Before you share a location, center on your profile's city if we know it.
  const city = profile?.data?.location ? (await supabase.from("cities").select("name, lat, lng").ilike("name", profile.data.location.trim()).maybeSingle()).data : null
  return (
    <div className={CONTAINER}>
      <NearMap items={items} profile={city ? { at: { lat: city.lat, lng: city.lng }, label: city.name } : null} />
    </div>
  )
}
