import { Flex, Skeleton } from "@stellaria/nebula-web";

import { SCREEN_SUBTITLE_HEIGHT, SCREEN_TITLE_HEIGHT } from "../metrics";
import { GridSkeleton } from "../grid-skeleton";

/** loading.tsx de la ruta (docs/07 §9.2): la cabecera y seis tarjetas con su geometria. */
export default function Loading() {
  return (
    <Flex direction="column" gap="lg" p={{ base: "sm", tablet: "lg" }}>
      <Flex direction="column" gap="xs">
        <Skeleton h={SCREEN_TITLE_HEIGHT} w={140} r="sm" />
        <Skeleton h={SCREEN_SUBTITLE_HEIGHT} w={200} r="sm" />
      </Flex>
      <GridSkeleton />
    </Flex>
  );
}
