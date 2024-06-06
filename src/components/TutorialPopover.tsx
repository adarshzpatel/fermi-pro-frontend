import {
  Button,
  Chip,
  Link,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@nextui-org/react";
import React from "react";
import { BiHelpCircle } from "react-icons/bi";

function TutorialPopover() {
  return (
    <Popover defaultOpen={true} placement="top-end" showArrow={true}>
      <PopoverTrigger className="absolute  bottom-6 right-6">
        <Button isIconOnly color="secondary">
          <BiHelpCircle className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent >
        <div className="max-w-md p-3">
        <h6 className="font-semibold">
          Steps to Use Fermi&apos;s Limit Orderbook:
          </h6>
        <ul className="list-decimal space-y-3 text-xs text-default-500 mt-2 pl-4">
          <li>
            Ensure you have devnet SOL <br /> <Link isExternal isBlock className="text-xs" color="success" href="https://faucet.solana.com">
            (use https://faucet.solana.com/)
            </Link> 
          </li>
          <li>
            Airdrop devnet tokens using the <Chip size="sm" variant="flat" color="warning"> <em> Airdrop </em>   </Chip> Tab on the
            top left of this page.
          </li>
          <li>Create an openorders account.</li>
          <li>
            Use different accounts to place matched bids/asks, and then call 
            <Chip size="sm" variant="flat" color="success" className="mx-2"> <em> Finalise</em></Chip>to execute Just in time settlement!
          </li>
          <li>
            After finalization, you can view and withdraw traded tokens on
            the <Chip size="sm" variant="flat" color="secondary"> <em> Settle Funds </em></Chip> tabs.
          </li>
        </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TutorialPopover;
