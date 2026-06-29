import { EmptyFunction, UnaryFunction } from "@shared/type";

export interface ImgListProps {
  onNextPage?: EmptyFunction;
  hasNextPage?: boolean;
  imgList: string[];
  onVisitPosition?: UnaryFunction<number>;
  tag?: string;
}
