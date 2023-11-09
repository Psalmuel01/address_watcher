import {ComposeClient} from "@composedb/client";
import {createContext, useContext, useEffect, useState} from "react";
import definitionJson from 'src/utils/runtime-composite.json';
import {DIDSession} from 'did-session';
import {EthereumWebAuth, getAccountId} from '@didtools/pkh-ethereum';

import {RuntimeCompositeDefinition} from '@composedb/types';
import {useAccount} from "wagmi";
import {publicProvider} from "wagmi/providers/public";
import {apolloClient} from "src/config/apollo-client";

const definition: RuntimeCompositeDefinition = definitionJson as RuntimeCompositeDefinition;

export const compose = new ComposeClient({
   ceramic: 'http://localhost:7007',
   definition,
});


interface Window {
   ethereum?: {
      // value that is populated and returns true by the Coinbase Wallet mobile dapp browser
      isCoinbaseWallet?: true;
      isMetaMask?: true;
      autoRefreshOnNetworkChange?: boolean;
      isBraveWallet?: true;
   };
}

const ComposeContext = createContext<{address: `0x${string}` | undefined; isConnected: boolean; session: DIDSession | undefined;}>({
   address: undefined,
   isConnected: false,
   session: undefined
});

const ComposeProvider = ({children}: {
   children: React.ReactNode;
}) => {
   const {address, isConnected} = useAccount();
   const [session, setSession] = useState<DIDSession>();

   useEffect(() => {
      apolloClient.refetchQueries({
         include: "active"
      });
   }, [session, address]);




   useEffect(() => {
      if (!isConnected) {
         setSession(undefined);
      }
      if (address) {


         const runCompose = async () => {
            const wind = window as Window;
            const accountId = await getAccountId(wind.ethereum, address);
            const authMethod = await EthereumWebAuth.getAuthMethod(wind.ethereum, accountId);

            const session = await DIDSession.get(accountId, authMethod, {
               resources: compose.resources,
            });

            compose.setDID(session.did);

            console.log(session);

            return session;
         };

         runCompose().then((session) => {
            setSession(session);
         });

      } else {
         setSession(undefined);
      }
   }, [isConnected, address]);

   return <ComposeContext.Provider value={{
      address, isConnected, session
   }}>
      {children}
   </ComposeContext.Provider>;
};


const useComposeContext = () => useContext(ComposeContext);



export {ComposeProvider, useComposeContext};