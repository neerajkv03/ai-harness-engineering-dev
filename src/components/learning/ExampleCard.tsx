import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inline } from "./Inline";

type Props = { title: string; context?: string; text: string };

export function ExampleCard({ title, context, text }: Props) {
  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {context && (
          <CardAction>
            <Badge variant="outline">{context}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="leading-7">
        <Inline text={text} />
      </CardContent>
    </Card>
  );
}
