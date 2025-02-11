"use client";
/*
Note: "use client" is a Next.js App Router directive that tells React to render the component as
a client component rather than a server component. This establishes the server-client boundary,
providing access to client-side functionality such as hooks and event handlers to this component and
any of its imported children. Although the SpeciesCard component itself does not use any client-side
functionality, it is beneficial to move it to the client because it is rendered in a list with a unique
key prop in species/page.tsx. When multiple component instances are rendered from a list, React uses the unique key prop
on the client-side to correctly match component state and props should the order of the list ever change.
React server components don't track state between rerenders, so leaving the uniquely identified components (e.g. SpeciesCard)
can cause errors with matching props and state in child components if the list order changes.
*/
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import type { Database } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Species = Database["public"]["Tables"]["species"]["Row"];

const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);
type KingdomType = z.infer<typeof kingdoms>;

const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val?.trim()),
  common_name: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .url()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  description: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

export default function SpeciesCard({ species, sessionId }: { species: Species; sessionId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(speciesSchema),
    defaultValues: {
      scientific_name: species.scientific_name,
      common_name: species.common_name,
      kingdom: species.kingdom,
      total_population: species.total_population,
      description: species.description,
      image: species.image,
    },
    mode: "onChange",
  });

  const onSubmit = async (input: any) => {
    const { error } = await supabase
      .from("species")
      .update({
        scientific_name: input.scientific_name,
        common_name: input.common_name,
        kingdom: input.kingdom,
        total_population: input.total_population,
        description: input.description,
        image: input.image,
      })
      .eq("id", species.id);

    // Catch and report errors from Supabase and exit the onSubmit function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setDialogOpen(false);
    router.refresh();
    toast({ title: "Species updated!", description: "Changes saved successfully." });
  };

  return (
    <div className="m-4 w-72 min-w-72 flex-none rounded border-2 p-3 shadow">
      {species.image && (
        <div className="relative h-40 w-full">
          <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
        </div>
      )}

      <h3 className="mt-3 text-2xl font-semibold">{species.scientific_name}</h3>
      <h4 className="text-lg font-light italic">{species.common_name}</h4>
      <p>{species.description ? species.description.slice(0, 150).trim() + "..." : ""}</p>

      {/* Learn More Button (Opens Details Dialog) */}
      <Button
        className="mt-3 w-full"
        onClick={() => {
          setDialogOpen(true);
          setIsEditing(false); // Open in read-only mode by default
        }}
      >
        Learn More
      </Button>

      {/* Dialog for Viewing/Editing Species */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Species" : `${species.common_name} (${species.scientific_name})`}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Update species details below." : species.description || "No description available."}
            </DialogDescription>
          </DialogHeader>

          {/* Display image in dialog */}
          {species.image && !isEditing && (
            <div className="relative mb-4 h-64 w-full">
              <Image
                src={species.image}
                alt={species.scientific_name}
                fill
                style={{ objectFit: "cover", borderRadius: "8px" }}
              />
            </div>
          )}

          {/* Editable Form (Only if the user is editing) */}
          {isEditing ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <Input {...form.register("scientific_name")} placeholder="Scientific Name" />
              <Input {...form.register("common_name")} placeholder="Common Name (Optional)" />

              <Select
                onValueChange={(value) => form.setValue("kingdom", value as KingdomType)}
                value={form.watch("kingdom") ?? "Animalia"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a kingdom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {kingdoms.options.map((kingdom) => (
                      <SelectItem key={kingdom} value={kingdom}>
                        {kingdom}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Input
                type="number"
                {...form.register("total_population", {
                  setValueAs: (value) => (value === "" ? null : Number(value)),
                })}
                placeholder="Total Population (Optional)"
              />
              <Input {...form.register("image")} placeholder="Image URL (Optional)" />
              <Textarea {...form.register("description")} placeholder="Description (Optional)" />
              <Button type="submit">Save Changes</Button>
            </form>
          ) : (
            <div className="mt-4 space-y-2">
              <p>
                <strong>Kingdom:</strong> {species.kingdom}
              </p>
              <p>
                <strong>Total Population:</strong> {species.total_population?.toLocaleString() || "Unknown"}
              </p>
            </div>
          )}

          {/* Edit Button (Only if the logged-in user is the author) */}
          {species.author === sessionId && !isEditing && (
            <Button
              className="mt-3 w-full"
              onClick={() => {
                setIsEditing(true);
              }}
            >
              Edit
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
