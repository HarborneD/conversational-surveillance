# \cetext{conceptualise a\\
# \hspace{0.5cm}\textasciitilde{} controlling thing \textasciitilde{} C that\\
# \hspace{0.5cm}is a device and\\
# \hspace{0.5cm}\textasciitilde{} can control \textasciitilde{}\\
# \hspace{1.0cm}the environment variable E.
# }



ce_text = """there is a query expansion phrase named 'of those'.
there is a query expansion phrase named 'of these'."""

out_text = "\\begin{figure}[ht]\n\centering\n\cetext{"+ce_text.replace("~","\\textasciitilde{}").replace("_","\\_").replace("'","\\textquotesingle{}").replace("\n","\\\\\n\\hspace{0.5cm}").replace("\hspace{0.5cm}then","then").replace("\hspace{0.5cm}conceptualise","conceptualise").replace("\hspace{0.5cm}if","if").replace("\hspace{0.5cm}there is","there is")  +"}\n\n\\end{figure}"

print(out_text)