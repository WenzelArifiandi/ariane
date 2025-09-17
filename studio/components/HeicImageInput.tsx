import type { ObjectInputProps } from 'sanity'import type { ObjectInputProps } from 'sanity';imp/**

import { Stack, Text } from '@sanity/ui'

import { Stack, Text } from '@sanity/ui'; * Lightweight helper wrapper around Sanity's default Image input.

/**

 * Lightweight helper wrapper around Sanity's default Image input. * No custom upload logic; just renders the default input and a note.

 * No custom upload logic; just renders the default input and a note.

 * (We can wire server HEIC->WebP later.)/** * (We can wire server HEIC->WebP later.)

 */

export function HeicImageInput(props: ObjectInputProps | any) { * Lightweight helper wrapper around Sanity's default Image input. */

  return (

    <Stack space={3}> * No custom upload logic; just renders the default input and a note.export function HeicImageInput(props: ObjectInputProps | any) {

      {props.renderDefault?.(props)}

      <Text size={1} muted> * (We can wire server HEIC->WebP later.)  return (

        Tip: HEIC/HEIF images aren't supported by browsers. Prefer JPG/PNG/WebP.

        (Server conversion can be enabled later.) */    <Stack space={3}>

      </Text>

    </Stack>export function HeicImageInput(props: ObjectInputProps | any) {      {props.renderDefault?.(props)}

  )

}  return (      <Text size={1} muted>



export default HeicImageInput    <Stack space={3}>        Tip: HEIC/HEIF images aren't supported by browsers. Prefer JPG/PNG/WebP.

      {props.renderDefault?.(props)}        (Server conversion can be enabled later.)

      <Text size={1} muted>      </Text>

        Tip: HEIC/HEIF images aren't supported by browsers. Prefer JPG/PNG/WebP.    </Stack>

        (Server conversion can be enabled later.)  );

      </Text>}tInputProps } from 'sanity';

    </Stack>import { Stack, Text } from '@sanity/ui';

  );

}/**;

 * Lightweight helper wrapper around Sanity's default Image input.;

export default HeicImageInput; * No custom upload logic; just renders the default input and a note.;
 * (We can wire server HEIC->WebP later.);
 */;
export function HeicImageInput(props: ObjectInputProps | any) {;
  return (;
    <Stack space={3}>;
      {props.renderDefault?.(props)};
      <Text size={1} muted>;
        Tip: HEIC/HEIF images aren’t supported by browsers. Prefer JPG/PNG/WebP.;
        (Server conversion can be enabled later.);
      </Text>;
    </Stack>;
  );
};

export default HeicImageInput;