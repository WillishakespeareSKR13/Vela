import { AspectRatio, Card, Flex, Skeleton, SimpleGrid } from "@stellaria/nebula-web";

import { CARD_META_HEIGHT, CARD_TITLE_HEIGHT } from "./metrics";

const COLS = { base: 1, phone: 1, tablet: 2, laptop: 3, desktop: 3, wide: 4 };

/** Esqueleto con la geometria exacta de `EquipoCard` (docs/07 §9.2). */
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SimpleGrid cols={COLS} gap="md">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} variant="glass" withBorder r="xl" p="xs" gap="xs">
          <AspectRatio ratio={16 / 9} r="lg" overflow="hidden" bg="surface.sunken">
            <Skeleton h="100%" w="100%" r="lg" />
          </AspectRatio>
          <Flex direction="column" gap="xxs" px="xs" pb="xxs">
            <Skeleton h={CARD_TITLE_HEIGHT} w={140} r="sm" />
            <Skeleton h={CARD_META_HEIGHT} w={180} r="sm" />
          </Flex>
        </Card>
      ))}
    </SimpleGrid>
  );
}
