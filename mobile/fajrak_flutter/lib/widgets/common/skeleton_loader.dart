import '../../utils/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class SkeletonLoader extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;
  final EdgeInsetsGeometry? margin;

  const SkeletonLoader({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 8,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    final baseColor = isDark 
        ? AppColors.surface2 
        : Colors.grey[300]!;
    final highlightColor = isDark 
        ? const Color(0xFF334155) 
        : Colors.grey[100]!;

    return Container(
      margin: margin,
      child: Shimmer.fromColors(
        baseColor: baseColor,
        highlightColor: highlightColor,
        child: Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            color: baseColor,
            borderRadius: BorderRadius.circular(borderRadius),
          ),
        ),
      ),
    );
  }
}

class CardSkeleton extends StatelessWidget {
  final double height;
  const CardSkeleton({super.key, this.height = 100});

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      width: double.infinity,
      height: height,
      borderRadius: 16,
      margin: const EdgeInsets.only(bottom: 12),
    );
  }
}

class ListSkeleton extends StatelessWidget {
  final int count;
  const ListSkeleton({super.key, this.count = 5});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        count,
        (index) => const CardSkeleton(height: 80),
      ),
    );
  }
}

class PageSkeleton extends StatelessWidget {
  const PageSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  SkeletonLoader(width: 120, height: 24),
                  SizedBox(height: 8),
                  SkeletonLoader(width: 80, height: 16),
                ],
              ),
              const SkeletonLoader(width: 48, height: 48, borderRadius: 12),
            ],
          ),
          const SizedBox(height: 24),
          const SkeletonLoader(width: double.infinity, height: 160, borderRadius: 24),
          const SizedBox(height: 24),
          Row(
            children: const [
              Expanded(child: SkeletonLoader(width: double.infinity, height: 80, borderRadius: 16)),
              SizedBox(width: 12),
              Expanded(child: SkeletonLoader(width: double.infinity, height: 80, borderRadius: 16)),
              SizedBox(width: 12),
              Expanded(child: SkeletonLoader(width: double.infinity, height: 80, borderRadius: 16)),
            ],
          ),
          const SizedBox(height: 24),
          const SkeletonLoader(width: 150, height: 20),
          const SizedBox(height: 16),
          const ListSkeleton(count: 3),
        ],
      ),
    );
  }
}
