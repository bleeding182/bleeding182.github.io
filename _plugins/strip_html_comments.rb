# Strips HTML comments from the rendered pages.
#
# Our own templates use {% comment %}, which Liquid never emits, so this is here
# for the comments we don't write: jekyll-seo-tag wraps its output in a Begin/End
# pair, and `excerpt_separator` leaves a literal <!--more--> in every post body.
# Neither is configurable, and both ship to every reader.
#
# This runs instead of a minifier gem. jekyll-minifier would also do it, but it
# re-minifies assets/bundle.js through uglifier, which is ES5-only and would choke
# on an ES module bundle.
module StripHtmlComments
  # A comment inside <pre>, <script> or <textarea> is content, not markup - a post
  # quoting Android XML, or a tool page hiding markup from an old parser. Split on
  # those first and only clean up what falls between them.
  # One capture group, no backreference: split() then interleaves cleanly, with
  # the protected blocks at odd indices and everything else at even ones.
  PROTECTED = %r{(<pre\b[^>]*>.*?</pre>|<script\b[^>]*>.*?</script>|<textarea\b[^>]*>.*?</textarea>)}mi

  # Conditional comments (<!--[if IE]>) are directives, not commentary.
  COMMENT = /<!--(?!\[if)(?:(?!-->).)*-->\n?/m

  def self.strip(html)
    html.split(PROTECTED).each_with_index.map do |part, i|
      i.even? ? part.gsub(COMMENT, "") : part
    end.join
  end
end

Jekyll::Hooks.register [:documents, :pages], :post_render do |item|
  next unless item.output_ext == ".html"

  item.output = StripHtmlComments.strip(item.output)
end
