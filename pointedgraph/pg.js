


///////////////////////////////////////////////////////////////////////////////////////////////
// pg.js, part of rdflib-pg-extension.js made by Stample
// see https://github.com/stample/rdflib.js
///////////////////////////////////////////////////////////////////////////////////////////////

$rdf.PG = {
    createNewStore: function(fetcherTimeout) {
        var store = new $rdf.IndexedFormula();
        // this makes "store.fetcher" variable available
        $rdf.fetcher(store, fetcherTimeout, true);
        return store;
    }
}

/**
 * Some common and useful namespaces already declared for you
 */
$rdf.PG.Namespaces = {
    LINK: $rdf.Namespace("http://www.w3.org/2007/ont/link#"),
    HTTP: $rdf.Namespace("http://www.w3.org/2007/ont/http#"),
    HTTPH: $rdf.Namespace("http://www.w3.org/2007/ont/httph#"),
    RDF: $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#"),
    RDFS: $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#"),
    OWL: $rdf.Namespace("http://www.w3.org/2002/07/owl#"),
    RSS: $rdf.Namespace("http://purl.org/rss/1.0/"),
    XSD: $rdf.Namespace("http://www.w3.org/TR/2004/REC-xmlschema-2-20041028/#dt-"),
    IANA: $rdf.Namespace("http://www.iana.org/assignments/link-relations/#"),

    CERT: $rdf.Namespace("http://www.w3.org/ns/auth/cert"),
    WAC: $rdf.Namespace("http://www.w3.org/ns/auth/acl#"),
    LDP: $rdf.Namespace("http://www.w3.org/ns/ldp#"),

    SIOC: $rdf.Namespace("http://rdfs.org/sioc/ns#"),
    DC: $rdf.Namespace("http://purl.org/dc/elements/1.1/"),
    FOAF: $rdf.Namespace("http://xmlns.com/foaf/0.1/"),
    CONTACT: $rdf.Namespace("http://www.w3.org/2000/10/swap/pim/contact#"),
    STAT: $rdf.Namespace("http://www.w3.org/ns/posix/stat#"),
    GEOLOC: $rdf.Namespace("http://www.w3.org/2003/01/geo/wgs84_pos#")
}



/**
 * Permits to get metadata about a pointed graph.
 * Like request headers and response headers.
 * RDFLib put these in the store as triples and it's not always easy to know where it puts the info.
 * This makes it easier to find back these metadatas
 */
$rdf.PG.MetadataHelper = {

    assertSingleStatement: function(stmts,msg) {
        if ( !stmts || stmts.length != 1 ) {
            throw new Error(msg + " - Expected exactly one statement. Found: "+stmts);
        }
    },

    getRequestNode: function(pg) {
        var fetchUriAsLit = $rdf.lit(pg.why().uri);
        var stmts = store.statementsMatching(undefined, $rdf.PG.Namespaces.LINK("requestedURI"), fetchUriAsLit, store.fetcher.appNode);
        this.assertSingleStatement(stmts,"There should be exactly one request node");
        var stmt = stmts[0];
        return stmt.subject;
    },

    getResponseNode: function(requestNode) {
        var stmts = store.statementsMatching(requestNode, $rdf.PG.Namespaces.LINK("response"), undefined);
        this.assertSingleStatement(stmts,"There should be exactly one response node");
        var stmt = stmts[0];
        return stmt.object;
    },

    getResponseHeaderValue: function(responseNode,headerName) {
        var headerSym = $rdf.PG.Namespaces.HTTPH(headerName.toLowerCase());
        var stmts = store.statementsMatching(responseNode, headerSym, undefined, responseNode);
        if ( !stmts || stmts.length == 0 ) return undefined;
        var stmt = stmts[0];
        return stmt.object;
    },

    getResponseStatus: function(responseNode) {
        var statusSym = $rdf.PG.Namespaces.HTTP("status");
        var stmts = store.statementsMatching(responseNode, statusSym, undefined, responseNode);
        this.assertSingleStatement(stmts,"There should be exactly one response node");
        var stmt = stmts[0];
        return stmt.object;
    },

    getResponseStatusText: function(responseNode) {
        var statusSym = $rdf.PG.Namespaces.HTTP("statusText");
        var stmts = store.statementsMatching(responseNode, statusSym, undefined, responseNode);
        this.assertSingleStatement(stmts,"There should be exactly one response node");
        var stmt = stmts[0];
        return stmt.object;
    },

    /**
     * Returns an helper method that is bound to the given pointed graph and permits to get metadatas related
     * to the underlying document / resource / named graph
     *
     * Note that you can only use this if the underlying document of the pg was retrieved through the fetcher.
     * If the data was added to the store manually then the requests/responses metadatas are not present in the store
     * unless you have added them by yourself
     */
    forPointedGraph: function(pg) {
        var self = this;
        var requestNode = this.getRequestNode(pg);
        var responseNode = this.getResponseNode(requestNode);
        return {
            getRequestNode: function() {
                return requestNode;
            },
            getResponseNode: function() {
                return responseNode;
            },
            getResponseStatus: function() {
                return self.getResponseStatus(responseNode);
            },
            getResponseStatusText: function() {
                return self.getResponseStatusText(responseNode);
            },
            getResponseHeaderValue: function(headerName) {
                return self.getResponseHeaderValue(responseNode,headerName);
            }
        }
    }

}



$rdf.PG.Utils = {

    /**
     * Just a little helper method to verify preconditions and fail fast.
     * See http://en.wikipedia.org/wiki/Precondition
     * See http://en.wikipedia.org/wiki/Fail-fast
     * @param condition
     * @param message
     */
    checkArgument: function(condition, message) {
        if (!condition) {
            throw Error('IllegalArgumentException: ' + (message || 'No description'));
        }
    },

    /**
     * remove hash from URL - this gets the document location
     * @param url
     * @returns {*}
     */
    fragmentless: function(url) {
        return url.split('#')[0];
    },

    isFragmentless: function(url) {
        return url.indexOf('#') == -1;
    },

    isFragmentlessSymbol: function(node) {
        return this.isSymbolNode(node) && this.isFragmentless(this.symbolNodeToUrl(node));
    },


    getTermType: function(node) {
        if ( node && node.termType ) {
            return node.termType
        } else {
            throw new Error("Can't get termtype on this object. Probably not an RDFlib node: "+node);
        }
    },


    isLiteralNode: function(node) {
        return this.getTermType(node) == 'literal';
    },
    isSymbolNode: function(node) {
        return this.getTermType(node) == 'symbol';
    },
    isBlankNode: function(node) {
        return this.getTermType(node) == 'bnode';
    },

    literalNodeToValue: function(node) {
        this.checkArgument(this.isLiteralNode(node), "Node is not a literal node:"+node);
        return node.value;
    },
    symbolNodeToUrl: function(node) {
        this.checkArgument(this.isSymbolNode(node), "Node is not a symbol node:"+node);
        return node.uri;
    },





    /**
     * Get the nodes for a given relation symbol
     * @param pg
     * @param relSym
     * @returns => List[Nodes]
     */
    getNodes: function(pg, relSym) {
        return _.chain( pg.rels(relSym) )
            .map(function(pg) {
                return pg.pointer;
            }).value();
    },

    getLiteralNodes: function(pg, relSym) {
        return _.chain($rdf.PG.Utils.getNodes(pg,relSym))
            .filter($rdf.PG.Utils.isLiteralNode)
            .value();
    },
    getSymbolNodes: function(pg, relSym) {
        return _.chain($rdf.PG.Utils.getNodes(pg,relSym))
            .filter($rdf.PG.Utils.isSymbolNode)
            .value();
    },
    getBlankNodes: function(pg, relSym) {
        return _.chain($rdf.PG.Utils.getNodes(pg,relSym))
            .filter($rdf.PG.Utils.isBlankNode)
            .value();
    },


    /**
     *
     * @param pgList
     * @returns {*}
     */
    getLiteralValues: function(pgList) {
        var rels = (slice.call(arguments, 1));
        var res =  _.chain(pgList)
            .map(function (pg) {
                return pg.getLiteral(rels);
            })
            .flatten()
            .value();
        return res;
    }

}

$rdf.PG.Utils.Rx = {

    /**
     * Permits to create an RxJs observable based on a list of promises
     * @param promiseList the list of promise you want to convert as an RxJs Observable
     * @param subject the type of Rx Subject you want to use (default to ReplaySubject)
     * @param onError, an optional callback for handling errors
     * @return {*}
     */
    promiseListToObservable: function(promiseList, subject, onError) {
        if ( promiseList.length == 0 ) {
            return Rx.Observable.empty();
        }
        // Default to ReplaySubject
        var subject = subject || new Rx.ReplaySubject();
        // Default to non-blocking error logging
        var onError = onError || function(error) {
            console.debug("Promise error catched in promiseListToObservable: ",error);
            // true means the stream won't continue.
            return false;
        };
        var i = 0;
        promiseList.map(function(promise) {
            promise.then(
                function (promiseValue) {
                    subject.onNext(promiseValue);
                    i++;
                    if ( i == promiseList.length ) {
                        subject.onCompleted();
                    }
                },
                function (error) {
                    var doStop = onError(error);
                    if ( doStop ) {
                        subject.onError(error);
                    }
                    else {
                        i++;
                        if ( i == promiseList.length ) {
                            subject.onCompleted();
                        }
                    }
                }
            )
        });
        return subject.asObservable();
    }

}


$rdf.PG.Filters = {
    isLiteralPointer: function(pg) {
        return pg.isLiteralPointer();
    },
    isBlankNodePointer: function(pg) {
        return pg.isBlankNodePointer();
    },
    isSymbolPointer: function(pg) {
        return pg.isSymbolPointer();
    }
}

$rdf.PG.Transformers = {
    literalPointerToValue: function(pg) {
        return $rdf.PG.Utils.literalNodeToValue(pg.pointer);
    },
    symbolPointerToValue: function(pg) {
        return $rdf.PG.Utils.symbolNodeToUrl(pg.pointer);
    },

    tripleToSubject: function(triple) {
        return triple.subject;
    },
    tripleToPredicate: function(triple) {
        return triple.predicate;
    },
    tripleToObject: function(triple) {
        return triple.object;
    }

}

