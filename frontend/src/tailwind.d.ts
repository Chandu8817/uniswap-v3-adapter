import { CSSProp } from "styled-components";

declare module "react" {
  interface HTMLAttributes<T> extends DOMAttributes<T> {
    css?: CSSProp;
  }
}

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.scss" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.sass" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.less" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.styl" {
  const content: { [className: string]: string };
  export default content;
}
