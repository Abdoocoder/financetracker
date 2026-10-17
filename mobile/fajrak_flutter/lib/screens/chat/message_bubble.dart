import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';

class MessageBubble extends StatelessWidget {
  final bool isUser;
  final String? content;
  final bool thinking;
  final ThemeData theme;

  const MessageBubble({
    super.key,
    required this.isUser,
    required this.content,
    required this.theme,
    this.thinking = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = theme.colorScheme;
    final bubbleColor =
        isUser ? colorScheme.primary : colorScheme.secondaryContainer;
    final textColor = isUser ? colorScheme.onPrimary : colorScheme.onSurface;

    return Align(
      alignment: isUser
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.78,
        ),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: bubbleColor,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
        ),
        child: thinking
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: textColor,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'chat_thinking'.tr(),
                    style: TextStyle(color: textColor, fontStyle: FontStyle.italic),
                  ),
                ],
              )
            : (isUser
                ? Text(
                    content ?? '',
                    style: TextStyle(color: textColor),
                  )
                : MarkdownBody(
                    data: content ?? '',
                    styleSheet: MarkdownStyleSheet(
                      p: TextStyle(color: textColor),
                      a: TextStyle(color: colorScheme.primary),
                    ),
                  )),
      ),
    );
  }
}
