# Splits a .sql file into individual statements, respecting -- comments,
# /* */ blocks, '...' literals, "..." identifiers and $tag$ dollar quoting.
# Used by season_tags_migration_test.sh phase 3 to run each statement in its
# own session. A naive split on ";" cuts statements mid-comment — that bug
# produced 37 phantom failures before this existed.
import re,sys,os
src=open(sys.argv[1]).read()
out=[];buf=[];i=0;n=len(src)
while i < n:
    c=src[i]
    # dollar-quoted block
    m=re.compile(r"\$[A-Za-z_]*\$").match(src,i)
    if m:
        tag=m.group(0); j=src.find(tag,m.end())
        j = n if j<0 else j+len(tag)
        buf.append(src[i:j]); i=j; continue
    # line comment
    if c=='-' and src.startswith('--',i):
        j=src.find('\n',i); j = n if j<0 else j+1
        buf.append(src[i:j]); i=j; continue
    # block comment
    if c=='/' and src.startswith('/*',i):
        j=src.find('*/',i); j = n if j<0 else j+2
        buf.append(src[i:j]); i=j; continue
    # single-quoted string ('' is an escaped quote)
    if c=="'":
        j=i+1
        while j<n:
            if src[j]=="'":
                if j+1<n and src[j+1]=="'": j+=2; continue
                j+=1; break
            j+=1
        buf.append(src[i:j]); i=j; continue
    # double-quoted identifier
    if c=='"':
        j=src.find('"',i+1); j = n if j<0 else j+1
        buf.append(src[i:j]); i=j; continue
    if c==';':
        buf.append(';'); out.append(''.join(buf)); buf=[]; i+=1; continue
    buf.append(c); i+=1
if ''.join(buf).strip(): out.append(''.join(buf))
d=sys.argv[2]; os.makedirs(d,exist_ok=True)
for f in os.listdir(d): os.remove(os.path.join(d,f))
k=0
for st in out:
    stripped=re.sub(r"--[^\n]*","",st)
    stripped=re.sub(r"/\*.*?\*/","",stripped,flags=re.S)
    if not stripped.strip().strip(';'): continue
    k+=1; open(f"{d}/{k:03d}.sql","w").write(st)
print(k)
