import { Page } from "@/components/shell";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Page>
      <EmptyState title="Page not found" body="That link is broken or the page moved." action={<LinkButton href="/">Go home</LinkButton>} />
    </Page>
  );
}
