import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

type WebhookPayload = {
  _type?: string;
  slug?: { current?: string };
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SANITY_REVALIDATE_SECRET) {
      return new NextResponse("Missing SANITY_REVALIDATE_SECRET", {
        status: 500,
      });
    }

    const { isValidSignature, body } = await parseBody<WebhookPayload>(
      req,
      process.env.SANITY_REVALIDATE_SECRET,
    );

    if (!isValidSignature) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    if (!body?._type) {
      return new NextResponse("Bad request", { status: 400 });
    }

    revalidateTag(body._type, "max");
    revalidatePath("/");
    revalidatePath("/talent");
    revalidatePath("/info");

    if (body.slug?.current) {
      revalidatePath(`/work/${body.slug.current}`);
      revalidatePath(`/talent/${body.slug.current}`);
    }

    return NextResponse.json({
      revalidated: true,
      type: body._type,
      now: Date.now(),
    });
  } catch (err) {
    console.error(err);
    return new NextResponse(
      err instanceof Error ? err.message : "Error revalidating",
      { status: 500 },
    );
  }
}
