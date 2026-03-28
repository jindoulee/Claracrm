import { type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  const query = request.nextUrl.searchParams.get("q");

  if (!query || typeof query !== "string") {
    return Response.json(
      { error: "Missing query parameter ?q=" },
      { status: 400 }
    );
  }

  const pattern = `%${query}%`;

  try {
    // Search contacts by name, company, role
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, full_name, nickname, company, role, avatar_url")
      .eq("user_id", userId)
      .or("status.eq.active,status.is.null")
      .or(
        `full_name.ilike.${pattern},company.ilike.${pattern},role.ilike.${pattern},nickname.ilike.${pattern}`
      )
      .limit(10);

    // Search contact facts by fact text
    const { data: factsRaw } = await supabase
      .from("contact_facts")
      .select("id, contact_id, fact_type, fact")
      .ilike("fact", pattern)
      .limit(10);

    // Enrich facts with contact info
    const factContactIds = [
      ...new Set((factsRaw || []).map((f: Record<string, unknown>) => f.contact_id as string)),
    ];
    let factContacts: Record<string, unknown>[] = [];
    if (factContactIds.length > 0) {
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, avatar_url")
        .in("id", factContactIds);
      factContacts = data || [];
    }
    const contactLookup = new Map(
      factContacts.map((c: Record<string, unknown>) => [c.id as string, c])
    );
    const facts = (factsRaw || []).map((f: Record<string, unknown>) => ({
      ...f,
      contact: contactLookup.get(f.contact_id as string) || null,
    }));

    // Search interactions by summary
    const { data: interactionsRaw } = await supabase
      .from("interactions")
      .select("id, interaction_type, summary, occurred_at, sentiment")
      .eq("user_id", userId)
      .ilike("summary", pattern)
      .order("occurred_at", { ascending: false })
      .limit(10);

    // Enrich interactions with contact info via interaction_contacts
    const interactionIds = (interactionsRaw || []).map(
      (i: Record<string, unknown>) => i.id as string
    );
    let interactionContactLinks: Record<string, unknown>[] = [];
    if (interactionIds.length > 0) {
      const { data } = await supabase
        .from("interaction_contacts")
        .select("interaction_id, contact_id")
        .in("interaction_id", interactionIds);
      interactionContactLinks = data || [];
    }
    const linkedContactIds = [
      ...new Set(
        interactionContactLinks.map(
          (l: Record<string, unknown>) => l.contact_id as string
        )
      ),
    ];
    let linkedContacts: Record<string, unknown>[] = [];
    if (linkedContactIds.length > 0) {
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, avatar_url")
        .in("id", linkedContactIds);
      linkedContacts = data || [];
    }
    const linkedContactLookup = new Map(
      linkedContacts.map((c: Record<string, unknown>) => [c.id as string, c])
    );

    const interactions = (interactionsRaw || []).map(
      (i: Record<string, unknown>) => {
        const links = interactionContactLinks.filter(
          (l: Record<string, unknown>) => l.interaction_id === i.id
        );
        const contactsForInteraction = links
          .map((l: Record<string, unknown>) =>
            linkedContactLookup.get(l.contact_id as string)
          )
          .filter(Boolean);
        return { ...i, contacts: contactsForInteraction };
      }
    );

    return Response.json({ contacts: contacts || [], facts, interactions });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
