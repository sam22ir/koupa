import { View } from 'react-native';
import { Card } from 'heroui-native/card';
import { Skeleton } from 'heroui-native/skeleton';

export function CustomerHomeSkeleton() {
  return (
    <View testID="customer-home-skeleton" className="gap-3">
      <Card className="gap-3 p-4">
        <View className="flex-row-reverse justify-between items-center">
          <Skeleton className="h-[26px] w-14 rounded-full" />
          <Skeleton className="h-3.5 w-1/2 rounded-md" />
        </View>
        <Skeleton className="h-6 w-3/5 self-end rounded-md" />
        <View className="flex-row-reverse items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="h-[18px] w-1/2 rounded-md" />
        </View>
        <View className="flex-row-reverse gap-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </View>
        <View className="h-px bg-surface-tertiary" />
        <View className="flex-row-reverse flex-wrap gap-2">
          <Skeleton className="h-20 w-[48%] rounded-lg" />
          <Skeleton className="h-20 w-[48%] rounded-lg" />
          <Skeleton className="h-20 w-[48%] rounded-lg" />
          <Skeleton className="h-20 w-[48%] rounded-lg" />
        </View>
      </Card>
      <Card className="gap-3 p-4">
        <Skeleton className="h-[18px] w-1/2 self-end rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </Card>
    </View>
  );
}